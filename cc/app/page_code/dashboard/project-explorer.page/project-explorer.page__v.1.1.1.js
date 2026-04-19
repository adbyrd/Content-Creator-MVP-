/**
 * Page: Project Explorer
 * Path: /page_code/dashboard/projectExplorer.page.js
 * Description: UI controller for managing, viewing, and navigating to business projects.
 * Version: [Project Explorer: v1.1.1]
 */

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { getMyProjects, getUserProjectCount } from 'backend/services/project.web';
import { showToaster } from 'public/utils/notification';

$w.onReady(async function () {
    console.log('[Project Explorer: v1.1.1] Project Explorer Initialized');

    handleQueryStatus();
    await refreshProjectDashboard();
    $w('#btnProject').onClick(() => openProjectSettings());
});

function handleQueryStatus() {
    const status = wixLocation.query.status;
    if (status === 'updated') {
        showToaster("Project saved successfully.", "success");
    } else if (status === 'created') {
        showToaster("New project created successfully.", "success");
    }
}

async function refreshProjectDashboard() {
    try {
        const [countRes, projectRes] = await Promise.all([
            getUserProjectCount(),
            getMyProjects()
        ]);

        if (countRes.ok) {
            $w('#projectCount').text = `You Currently Have ${countRes.count} Projects.`;
        }

        if (projectRes.ok) {
            renderProjectList(projectRes.data);
        }
    } catch (err) {
        console.error('[Project Explorer: v1.1.1] Dashboard refresh failed:', err);
    }
}

function renderProjectList(projects) {
    const $repeater = $w('#projectRepeater');
    
    if (!projects || projects.length === 0) {
        $repeater.collapse();
        // Clear data to ensure the UI updates if all projects were deleted
        $repeater.data = []; 
        return;
    }

    // CRITICAL: Define the handler BEFORE assigning data
    $repeater.onItemReady(($item, itemData) => {
        // Validation: Check if fields exist before assignment to avoid empty strings
        $item('#txtProjectTitle').text = itemData.title || "Untitled Project";
        $item('#txtProjectDescription').text = itemData.description || "No description provided.";

        // Navigation Handler
        $item('#txtProjectTitle').onClick(() => {
            wixLocation.to(`/dashboard/project-editor?id=${itemData._id}`);
        });
    });

    // Assign data last to trigger the rendering cycle
    $repeater.data = projects;
    $repeater.expand();
}

async function openProjectSettings() {
    try {
        const result = await wixWindow.openLightbox("New Project");

        if (result && result.updated) {
            console.log('[Project Explorer: v1.1.1] New project created. Refreshing UI.');
            await refreshProjectDashboard();
            showToaster("Project created successfully!", "success");
        }
    } catch (err) {
        console.error('[Project Explorer: v1.1.1] Error opening project modal:', err);
    }
}