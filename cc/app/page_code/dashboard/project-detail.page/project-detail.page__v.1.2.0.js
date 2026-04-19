/**
 * Page: Project Detail (Dynamic)
 * Path: /projects/{_id}
 * Version: [ PROJECT DETAIL : v.1.2.0 ]
 */

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { generateStoryboard } from 'backend/services/project.web';
import { validateProjectForGeneration } from 'public/utils/validation';
import { safeDisable, safeShow, safeHide } from 'public/utils/ui';
import { showToaster } from 'public/utils/notification';

const VERSION = '[ PROJECT DETAIL : v.1.2.0 ]';

/**
 * Module-level project state.
 * Populated on load and re-synced after every dataset refresh so that
 * repeat edit clicks always receive the latest persisted data.
 */
let _currentProject = null;

$w.onReady(function () {
    console.log(`${VERSION} Project Detail Page Initializing...`);

    _currentProject = $w('#dynamicDataset').getCurrentItem();

    setupPageUI(_currentProject);
    wireEditButton();
    wireGenerateButton();
});

// ─── PAGE SETUP ───────────────────────────────────────────────────────────────

function setupPageUI(data) {
    if (!data) return;

    $w('#txtBreadcrumb').text = `Projects / ${data.title}`;

    $w('#btnBack').onClick(() => {
        wixLocation.to("/projects");
    });
}

// ─── EDIT BUTTON ──────────────────────────────────────────────────────────────

/**
 * Wires the Edit button to open the Project Settings modal pre-populated
 * with the latest project data.
 *
 * After a successful save:
 *   1. The dataset is refreshed (updates all bound UI elements).
 *   2. _currentProject is re-read from the dataset so the next edit
 *      click receives current data, not a stale snapshot.
 *   3. The toaster confirms the update to the user.
 */
function wireEditButton() {
    $w('#btnEditProject').onClick(async () => {
        if (!_currentProject) {
            console.warn(`${VERSION} Edit triggered but no project data available.`);
            return;
        }

        try {
            console.log(`${VERSION} Opening edit modal for project: ${_currentProject._id}`);

            const result = await wixWindow.openLightbox('Project', { project: _currentProject });

            if (result && result.updated) {
                console.log(`${VERSION} Project edit confirmed. Refreshing dataset...`);
                await $w('#dynamicDataset').refresh();

                // Re-sync module state from the freshly refreshed dataset
                _currentProject = $w('#dynamicDataset').getCurrentItem();
                console.log(`${VERSION} _currentProject synced: "${_currentProject?.title}"`);

                showToaster("Project updated successfully.", "success");
            }
        } catch (err) {
            console.error(`${VERSION} Error handling edit modal close:`, err);
        }
    });
}

// ─── GENERATE STORYBOARD BUTTON ───────────────────────────────────────────────

/**
 * Triggers the n8n storyboard generation pipeline for the current project.
 * Reads from _currentProject at click-time to ensure it always operates
 * on the latest project state.
 *
 * Guards against invalid project state before dispatching the backend call.
 */
function wireGenerateButton() {
    $w('#btnGenerateStoryboard').onClick(async () => {
        // 1. Client-side validation
        const validation = validateProjectForGeneration(_currentProject);
        if (!validation.isValid) {
            showError(validation.message);
            return;
        }

        // 2. Enter 'Generating' state
        toggleLoadingState(true);

        // 3. Dispatch backend service
        const result = await generateStoryboard(_currentProject._id);

        if (result.ok) {
            // UI remains in loading state while n8n processes & writes back to DB.
            // Dataset refresh surfaces the updated storyboard content automatically.
            $w('#dynamicDataset').refresh();
        } else {
            toggleLoadingState(false);
            showError("Failed to start generation. Please try again.");
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
    console.error(`${VERSION} Page error: ${message}`);
    showToaster(message, "error");
}