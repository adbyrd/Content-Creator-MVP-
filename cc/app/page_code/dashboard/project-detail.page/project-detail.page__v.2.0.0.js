/**
 * Page: Project Detail (Dynamic)
 * Path: /page_code/dashboard/project-detail.page.js
 * Version: [ PROJECT DETAIL : v.2.0.0 ]
 *
 * CHANGES FROM v.1.3.0:
 *   - wireGenerateButton() now starts the storyboard polling loop
 *   - Progressive frame reveal via storyboard-poller utility
 *   - onComplete / onTimeout / onError handlers for full pipeline lifecycle
 *   - poller instance stored in module state and stopped on re-generate
 */

import wixLocation  from 'wix-location';
import wixWindow    from 'wix-window';
import { verifyProjectAccess, generateStoryboard } from 'backend/services/project.web';
import { validateProjectForGeneration } from 'public/utils/validation';
import { safeDisable, safeShow, safeHide } from 'public/utils/ui';
import { showToaster } from 'public/utils/notification';
import { startStoryboardPolling, stopStoryboardPolling } from 'public/utils/storyboard-poller';

const VERSION           = '[ PROJECT DETAIL : v.2.0.0 ]';
const PATH_UNAUTHORIZED = '/cc';

const MSG_GENERATION_FAILED  = 'Unable to start generation. Please try again.';
const MSG_POLL_TIMEOUT        = 'Generation is taking longer than expected. We\'ll notify you when it\'s ready.';
const MSG_POLL_ERROR          = 'Lost connection to generation service. Please refresh the page.';
const MSG_PROJECT_UPDATED     = 'Project updated successfully.';

// ─── MODULE STATE ─────────────────────────────────────────────────────────────

let _currentProject   = null;
let _activePoller     = null;   // storyboard-poller controller instance

// ─── BOOT ─────────────────────────────────────────────────────────────────────

$w.onReady(async function () {
    console.log(`${VERSION} Initializing...`);

    const datasetItem = $w('#dynamicDataset').getCurrentItem();

    if (!datasetItem?._id) {
        console.warn(`${VERSION} No dataset item found. Redirecting.`);
        wixLocation.to(PATH_UNAUTHORIZED);
        return;
    }

    const accessResult = await verifyProjectAccess(datasetItem._id);

    if (!accessResult.ok || !accessResult.authorized) {
        const reason = accessResult.error?.type || 'UNKNOWN';
        console.warn(`${VERSION} Access denied. Reason: ${reason}. Redirecting.`);
        wixLocation.to(PATH_UNAUTHORIZED);
        return;
    }

    _currentProject = accessResult.data;
    console.log(`${VERSION} Access granted. Rendering: "${_currentProject.title}"`);

    setupPageUI();
    wireEditButton();
    wireGenerateButton();

    // ── Resume polling if page is loaded mid-generation ────────────────────
    // If the user navigated away and came back while generation is running,
    // restart the polling loop so the UI catches up with already-saved frames.
    if (_currentProject.storyboardStatus === 'generating') {
        console.log(`${VERSION} Generation in progress. Resuming polling...`);
        toggleLoadingState(true);
        beginPolling(_currentProject._id);
    }

    safeShow('#pageContentContainer');
});

// ─── PAGE SETUP ───────────────────────────────────────────────────────────────

function setupPageUI() {
    $w('#txtBreadcrumb').text = `Projects / ${_currentProject.title}`;
    $w('#btnBack').onClick(() => {
        stopStoryboardPolling(_activePoller);
        wixLocation.to('/projects');
    });
}

// ─── EDIT BUTTON ──────────────────────────────────────────────────────────────

function wireEditButton() {
    $w('#btnEditProject').onClick(async () => {
        if (!_currentProject) {
            console.warn(`${VERSION} Edit triggered but _currentProject is null.`);
            return;
        }

        try {
            const result = await wixWindow.openLightbox('Project', { project: _currentProject });

            if (result?.updated) {
                const refreshed = await verifyProjectAccess(_currentProject._id);

                if (refreshed.ok && refreshed.authorized) {
                    _currentProject = refreshed.data;
                } else {
                    wixLocation.to(PATH_UNAUTHORIZED);
                    return;
                }

                await $w('#dynamicDataset').refresh();
                showToaster(MSG_PROJECT_UPDATED, 'success');
            }
        } catch (err) {
            console.error(`${VERSION} Edit modal error:`, err);
        }
    });
}

// ─── GENERATE STORYBOARD BUTTON ───────────────────────────────────────────────

function wireGenerateButton() {
    $w('#btnGenerateStoryboard').onClick(async () => {
        // 1. Validate all required project fields before dispatching
        const validation = validateProjectForGeneration(_currentProject);
        if (!validation.isValid) {
            showError(validation.message);
            return;
        }

        // 2. Stop any existing poller (re-generate scenario)
        stopStoryboardPolling(_activePoller);
        _activePoller = null;

        // 3. Enter loading state
        toggleLoadingState(true);
        clearStoryboardUI();

        // 4. Dispatch generation pipeline to backend → n8n
        const result = await generateStoryboard(_currentProject._id);

        if (!result.ok) {
            const errType = result.error?.type;

            // Special case: already running — just start polling (user re-clicked)
            if (errType === 'ALREADY_RUNNING') {
                console.log(`${VERSION} Generation already running — attaching poller.`);
                beginPolling(_currentProject._id);
                return;
            }

            toggleLoadingState(false);
            showError(result.error?.message || MSG_GENERATION_FAILED);
            return;
        }

        console.log(`${VERSION} Generation dispatched. Starting polling...`);
        // 5. Begin polling — loading state held until complete/timeout/error
        beginPolling(_currentProject._id);
    });
}

// ─── POLLING ──────────────────────────────────────────────────────────────────

/**
 * Starts the storyboard polling loop and binds all lifecycle callbacks.
 *
 * @param {string} projectId
 */
function beginPolling(projectId) {
    _activePoller = startStoryboardPolling(projectId, {

        /**
         * Called for each new frame as it arrives.
         * Renders the frame into the storyboard repeater progressively.
         */
        onFrame(frame, allFrames) {
            console.log(`${VERSION} Rendering frame ${frame.frameIndex + 1}/${15}`);
            renderStoryboardFrame(frame, allFrames);
            updateFrameProgressLabel(allFrames.length);
        },

        /**
         * Called once all 15 frames are confirmed.
         * Releases the loading state and refreshes the dataset.
         */
        onComplete(allFrames) {
            console.log(`${VERSION} Storyboard complete. ${allFrames.length} frames rendered.`);
            _activePoller = null;
            toggleLoadingState(false);
            renderFullStoryboard(allFrames);
            $w('#dynamicDataset').refresh();
            showToaster('Storyboard generated successfully!', 'success');
        },

        /**
         * Called if the 10-minute hard timeout elapses.
         * Releases loading state with a friendly message.
         */
        onTimeout() {
            console.warn(`${VERSION} Polling timed out.`);
            _activePoller = null;
            toggleLoadingState(false);
            showError(MSG_POLL_TIMEOUT);
        },

        /**
         * Called on terminal errors (auth loss, forbidden, not found).
         * Redirects if authorization was revoked.
         */
        onError(err) {
            console.error(`${VERSION} Polling error: ${err?.type}`);
            _activePoller = null;
            toggleLoadingState(false);

            if (['AUTH_REQUIRED', 'FORBIDDEN'].includes(err?.type)) {
                wixLocation.to(PATH_UNAUTHORIZED);
                return;
            }

            showError(MSG_POLL_ERROR);
        }
    });
}

// ─── STORYBOARD UI RENDERING ──────────────────────────────────────────────────

/**
 * Renders a single incoming frame into the storyboard repeater.
 * The repeater is rebuilt on each call using the full accumulated frames array.
 * This avoids out-of-order rendering if frames arrive non-sequentially.
 *
 * @param {object} _newFrame   — the just-arrived frame (unused directly)
 * @param {array}  allFrames   — all frames seen so far, sorted by frameIndex
 */
function renderStoryboardFrame(_newFrame, allFrames) {
    const sorted = [...allFrames].sort((a, b) => a.frameIndex - b.frameIndex);
    populateStoryboardRepeater(sorted);
}

/**
 * Final render pass once all 15 frames are confirmed.
 * Same as renderStoryboardFrame but with the authoritative sorted set.
 *
 * @param {array} allFrames
 */
function renderFullStoryboard(allFrames) {
    const sorted = [...allFrames].sort((a, b) => a.frameIndex - b.frameIndex);
    populateStoryboardRepeater(sorted);
}

/**
 * Binds frame data to the #storyboardRepeater element.
 * Each item renders: frame number, image, prompt text, and frame metadata.
 *
 * @param {array} frames — sorted by frameIndex
 */
function populateStoryboardRepeater(frames) {
    const $repeater = $w('#storyboardRepeater');
    if (!$repeater) return;

    $repeater.onItemReady(($item, itemData) => {
        $item('#txtFrameNumber').text  = `Frame ${itemData.frameIndex + 1}`;
        $item('#imgFramePreview').src  = itemData.imageUrl || '';
        $item('#txtFramePrompt').text  = itemData.promptText || '';
    });

    $repeater.data = frames;

    if (frames.length > 0) {
        $repeater.expand();
    }
}

/**
 * Updates the progressive frame count label during generation.
 *
 * @param {number} count — frames received so far
 */
function updateFrameProgressLabel(count) {
    const $label = $w('#txtGeneratingStatus');
    if ($label) {
        $label.text = `Generating storyboard... ${count} of ${15} frames ready`;
    }
}

/**
 * Collapses the storyboard repeater and clears any previous generation state.
 * Called before a new generation run to prevent stale frames showing.
 */
function clearStoryboardUI() {
    const $repeater = $w('#storyboardRepeater');
    if ($repeater) {
        $repeater.data = [];
        $repeater.collapse();
    }
    updateFrameProgressLabel(0);
}

// ─── LOADING STATE ────────────────────────────────────────────────────────────

function toggleLoadingState(isLoading) {
    if (isLoading) {
        safeDisable('#btnGenerateStoryboard');
        safeShow('#ccLoadingPreloader');
    } else {
        $w('#btnGenerateStoryboard').enable();
        safeHide('#ccLoadingPreloader');
    }
}

// ─── ERROR DISPLAY ────────────────────────────────────────────────────────────

function showError(message) {
    console.error(`${VERSION} Error: ${message}`);
    showToaster(message, 'error');
}