/**
 * Page: Project Detail (Dynamic)
 * Path: /projects/{_id}
 * Version: [ PROJECT DETAIL : v.1.0.1 ]
 */

import wixLocation from 'wix-location';

const VERSION = '[ PROJECT DETAIL : v.1.0.1 ]';

$w.onReady(function () {
    // 1. Target your dynamic dataset
    $w("#dynamicDataset").onReady(() => {
        
        // 2. Retrieve the item currently loaded by the dynamic URL
        const currentProject = $w("#dynamicDataset").getCurrentItem();

        // 3. Validate the data exists before initializing UI
        if (currentProject) {
            console.log(`${VERSION} Viewing Project: ${currentProject.title}`);
            setupPageUI(currentProject);
        } else {
            console.error(`${VERSION} Error: No project data found.`);
        }
    });
});

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