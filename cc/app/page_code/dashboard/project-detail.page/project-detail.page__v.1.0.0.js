/**
 * Page: Project Detail (Dynamic)
 * Path: /projects/{_id}
 * Version: [ PROJECT DETAIL : v.1.0.0 ]
 */

import wixLocation from 'wix-location';

const VERSION = '[ PROJECT DETAIL : v.1.0.0 ]';

$w.onReady(function () {
    console.log(`${VERSION} Viewing Project: ${currentProject.title}`);
    setupPageUI(currentProject);
});

function setupPageUI(data) {
    // Example: Update page title or breadcrumb
    $w('#txtBreadcrumb').text = `Projects / ${data.title}`;
    
    // Wire up a back button
    $w('#btnBack').onClick(() => {
        wixLocation.to("/projects");
    });
}