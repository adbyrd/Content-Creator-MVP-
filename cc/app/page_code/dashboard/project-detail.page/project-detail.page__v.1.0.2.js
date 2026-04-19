/**
 * Page: Project Detail (Dynamic)
 * Path: /projects/{_id}
 * Version: [ PROJECT DETAIL : v.1.0.1 ]
 */

import wixLocation from 'wix-location';
import { generateStoryboard } from 'backend/services/project.web';
import { validateProjectForGeneration } from 'public/utils/validation';
import { safeDisable, safeShow, safeHide } from 'public/utils/ui';

const VERSION = '[ PROJECT DETAIL : v.1.0.1 ]';

$w.onReady(function () {
    const project = $w('#dynamicDataset').getCurrentItem();

    $w('#btnGenerateStoryboard').onClick(async () => {
        // 1. Client-side Validation [cite: 167]
        const validation = validateProjectForGeneration(project);
        if (!validation.isValid) {
            showError(validation.message);
            return;
        }

        // 2. Enter 'Generating' State 
        toggleLoadingState(true);

        // 3. Call Backend Service
        const result = await generateStoryboard(project._id);

        if (result.ok) {
            // UI remains in loading state while n8n processes & updates DB
            // Database-to-UI sync handled via Dataset Refresh
            $w('#dynamicDataset').refresh();
        } else {
            toggleLoadingState(false);
            showError("Failed to start generation. Please try again.");
        }
    });
});

function toggleLoadingState(isLoading) {
    if (isLoading) {
        safeDisable('#btnGenerateStoryboard'); // [cite: 160]
        safeShow('#ccLoadingPreloader'); // [cite: 180]
    } else {
        $w('#btnGenerateStoryboard').enable();
        safeHide('#ccLoadingPreloader');
    }
}

function setupPageUI(data) {
    // Update page title or breadcrumb
    // Ensure the ID matches your element on the canvas
    if ($w('#txtBreadcrumb').length > 0) {
        $w('#txtBreadcrumb').text = `Projects / ${data.title}`;
    }
    
    // Wire up a back button
    $w('#btnBack').onClick(() => {
        wixLocation.to("/projects");
    });
}