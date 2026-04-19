/**
 * Page: Project Detail (Dynamic)
 * Path: /page_code/dashboard/project-detail.page.js
 * Version: [ PROJECT DETAIL : v.1.3.0 ]
 */

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { verifyProjectAccess, generateStoryboard } from 'backend/services/project.web';
import { validateProjectForGeneration } from 'public/utils/validation';
import { safeDisable, safeShow, safeHide } from 'public/utils/ui';
import { showToaster } from 'public/utils/notification';

const VERSION = '[ PROJECT DETAIL : v.1.3.0 ]';

// Redirect target for any unauthorized or unauthenticated access attempt.
const PATH_UNAUTHORIZED = '/cc';

// ─── MODULE STATE ─────────────────────────────────────────────────────────────

/**
 * Authoritative project state for this page session.
 *
 * Populated exclusively from the verifyProjectAccess backend response —
 * never from the raw dataset — so it is always an ownership-verified copy.
 *
 * Re-synced after every successful edit via a second verifyProjectAccess
 * call, ensuring repeat edit clicks always dispatch the latest persisted
 * data to the modal.
 */
let _currentProject = null;

// ─── BOOT ─────────────────────────────────────────────────────────────────────

$w.onReady(async function () {
    console.log(`${VERSION} Initializing...`);

    // ── 1. Read project ID from the dynamic dataset ───────────────────────────
    // The dataset is bound to the dynamic page URL slug by Wix. We only need
    // the _id at this stage — all authoritative data comes from the backend.
    const datasetItem = $w('#dynamicDataset').getCurrentItem();

    if (!datasetItem?._id) {
        console.warn(`${VERSION} No dataset item found. Redirecting.`);
        wixLocation.to(PATH_UNAUTHORIZED);
        return;
    }

    // ── 2. Server-side access verification ───────────────────────────────────
    // This is the security gate. The page content container is hidden on load
    // (set via the Wix editor) and only revealed after authorization is
    // confirmed, preventing any flash of unauthorized content.
    console.log(`${VERSION} Verifying access for project: ${datasetItem._id}`);
    const accessResult = await verifyProjectAccess(datasetItem._id);

    if (!accessResult.ok || !accessResult.authorized) {
        const reason = accessResult.error?.type || 'UNKNOWN';
        console.warn(`${VERSION} Access denied. Reason: ${reason}. Redirecting.`);
        wixLocation.to(PATH_UNAUTHORIZED);
        return;
    }

    // ── 3. Populate module state from the verified backend response ───────────
    _currentProject = accessResult.data;
    console.log(`${VERSION} Access granted. Rendering: "${_currentProject.title}"`);

    // ── 4. Render and wire ────────────────────────────────────────────────────
    setupPageUI();
    wireEditButton();
    wireGenerateButton();

    // Reveal the page content now that authorization is confirmed.
    safeShow('#pageContentContainer');
});

// ─── PAGE SETUP ───────────────────────────────────────────────────────────────

function setupPageUI() {
    $w('#txtBreadcrumb').text = `Projects / ${_currentProject.title}`;
    $w('#btnBack').onClick(() => wixLocation.to('/projects'));
}

// ─── EDIT BUTTON ──────────────────────────────────────────────────────────────

/**
 * Opens the Project Settings modal pre-populated with the latest project data.
 *
 * After a confirmed save:
 *   1. A second verifyProjectAccess call re-fetches the updated record from
 *      the backend, keeping _currentProject in sync with the DB.
 *   2. The dynamic dataset is refreshed so all bound UI elements update.
 *   3. A toaster confirms the action to the user.
 *
 * Re-syncing via verifyProjectAccess (rather than dataset.getCurrentItem)
 * guarantees the module state reflects the persisted record, not a
 * potentially stale in-memory snapshot from the dataset.
 */
function wireEditButton() {
    $w('#btnEditProject').onClick(async () => {
        if (!_currentProject) {
            console.warn(`${VERSION} Edit triggered but _currentProject is null.`);
            return;
        }

        try {
            console.log(`${VERSION} Opening edit modal for project: ${_currentProject._id}`);
            const result = await wixWindow.openLightbox('Project', { project: _currentProject });

            if (result?.updated) {
                console.log(`${VERSION} Edit confirmed. Re-syncing project state...`);

                // Re-fetch the authoritative record from the backend.
                const refreshed = await verifyProjectAccess(_currentProject._id);

                if (refreshed.ok && refreshed.authorized) {
                    _currentProject = refreshed.data;
                    console.log(`${VERSION} _currentProject synced: "${_currentProject.title}"`);
                } else {
                    // Access was revoked between edit and re-sync (edge case).
                    console.warn(`${VERSION} Re-sync access check failed. Redirecting.`);
                    wixLocation.to(PATH_UNAUTHORIZED);
                    return;
                }

                // Refresh bound UI elements.
                await $w('#dynamicDataset').refresh();
                showToaster('Project updated successfully.', 'success');
            }
        } catch (err) {
            console.error(`${VERSION} Edit modal error:`, err);
        }
    });
}

// ─── GENERATE STORYBOARD BUTTON ───────────────────────────────────────────────

/**
 * Triggers the n8n storyboard generation pipeline for the current project.
 *
 * Reads _currentProject at click-time (not captured at wire-time) so it
 * always operates on the latest post-edit state.
 *
 * The UI stays in loading state after a successful dispatch — the async
 * n8n pipeline writes back to the DB, and dataset.refresh() will surface
 * the completed storyboard when it is ready.
 */
function wireGenerateButton() {
    $w('#btnGenerateStoryboard').onClick(async () => {
        // 1. Client-side field validation against current project state.
        const validation = validateProjectForGeneration(_currentProject);
        if (!validation.isValid) {
            showError(validation.message);
            return;
        }

        // 2. Enter loading state.
        toggleLoadingState(true);

        // 3. Dispatch the generation pipeline.
        const result = await generateStoryboard(_currentProject._id);

        if (result.ok) {
            // Loading state intentionally held — pipeline is async.
            // Dataset refresh will update the UI when n8n writes back.
            $w('#dynamicDataset').refresh();
        } else {
            toggleLoadingState(false);
            showError('Failed to start generation. Please try again.');
        }
    });
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