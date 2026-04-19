/**
 * Page: Project Detail (Dynamic)
 * Path: /projects/{_id}
 * Version: [ PROJECT DETAIL : v.1.1.0 ]
 */

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { generateStoryboard } from 'backend/services/project.web';
import { validateProjectForGeneration } from 'public/utils/validation';
import { safeDisable, safeShow, safeHide } from 'public/utils/ui';
import { showToaster } from 'public/utils/notification';

const VERSION = '[ PROJECT DETAIL : v.1.1.0 ]';

$w.onReady(function () {
    console.log(`${VERSION} Project Detail Page Initializing...`);

    const project = $w('#dynamicDataset').getCurrentItem();

    setupPageUI(project);
    wireEditButton(project);
    wireGenerateButton(project);
});

// ─── PAGE SETUP ───────────────────────────────────────────────────────────────

function setupPageUI(data) {
    if (!data) return;

    if ($w('#txtBreadcrumb').length > 0) {
        $w('#txtBreadcrumb').text = `Projects / ${data.title}`;
    }

    $w('#btnBack').onClick(() => {
        wixLocation.to("/projects");
    });
}

// ─── EDIT BUTTON ──────────────────────────────────────────────────────────────

/**
 * Wires the Edit button to open the Project Settings modal pre-populated
 * with the current project's data.
 *
 * On successful save the dynamic dataset is refreshed so all bound UI
 * elements update automatically, and a toaster confirms the action.
 *
 * @param {object} project - The current dynamic dataset item.
 */
function wireEditButton(project) {
    $w('#btnEditProject').onClick(async () => {
        if (!project) {
            console.warn(`${VERSION} Edit triggered but no project data available.`);
            return;
        }

        try {
            console.log(`${VERSION} Opening edit modal for project: ${project._id}`);

            const result = await wixWindow.openLightbox('Project', { project });

            if (result && result.updated) {
                console.log(`${VERSION} Project edit confirmed. Refreshing dataset...`);
                await $w('#dynamicDataset').refresh();
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
 * Guards against invalid project state before dispatching the backend call.
 *
 * @param {object} project - The current dynamic dataset item.
 */
function wireGenerateButton(project) {
    $w('#btnGenerateStoryboard').onClick(async () => {
        // 1. Client-side validation
        const validation = validateProjectForGeneration(project);
        if (!validation.isValid) {
            showError(validation.message);
            return;
        }

        // 2. Enter 'Generating' state
        toggleLoadingState(true);

        // 3. Dispatch backend service
        const result = await generateStoryboard(project._id);

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