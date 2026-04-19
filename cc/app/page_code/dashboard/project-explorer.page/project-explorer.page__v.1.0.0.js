/**
 * Page: Project Explorer
 * Path: /page_code/dashboard/projectExplorer.page.js
 * Description: UI controller for managing and viewing business projects.
 * Version: [cc-v1.0.0]
 */

import wixWindow from 'wix-window';
import { getUserProjectCount } from 'backend/services/project.web';
import { showToaster } from 'public/utils/notification';

$w.onReady(async function () {
    console.log('[cc-v1.0.0] Project Explorer Initialized');
    
    // Initial load of project count
    await updateProjectCounter();

    // Wire button to open the Project Settings Modal
    $w('#btnProject').onClick(() => openProjectSettings());
});

async function updateProjectCounter() {
    const res = await getUserProjectCount();
    if (res.ok) {
        $w('#projectCount').text = `You Currently Have ${res.count} Projects.`;
    }
}

async function openProjectSettings() {
    try {
        const result = await wixWindow.openLightbox("New Project");

        if (result && result.updated) {
            console.log('[cc-v1.0.0] New project created. Refreshing UI.');
            await updateProjectCounter();
            showToaster("Project created successfully!", "success");
        }
    } catch (err) {
        console.error('[cc-v1.0.0] Error opening project modal:', err);
    }
}