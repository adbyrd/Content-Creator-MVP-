/**
 * Page: Project Explorer
 * Path: /page_code/dashboard/projectExplorer.page.js
 * Description: UI controller for managing, viewing, and navigating to business projects.
 * Version: [Project Explorer: v1.3.0]
 */

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { getMyProjects, getUserProjectCount } from 'backend/services/project.web';
import { showToaster } from 'public/utils/notification';

$w.onReady(async function () {
    console.log('[Project Explorer: v1.3.0] Project Explorer Initialized');
    
    // 1. Check for success messages from CRUD redirects
    handleQueryStatus();

    // 2. Initial Dashboard Hydration
    await refreshProjectDashboard();

    // 3. Wire Global Handlers
    $w('#btnProject').onClick(() => openProjectSettings());
});

/**
 * Checks URL query parameters to display success toasters after CRUD operations
 */
function handleQueryStatus() {
    const status = wixLocation.query.status;
    if (status === 'updated') {
        showToaster("Project saved successfully.", "success");
    } else if (status === 'created') {
        showToaster("New project created successfully.", "success");
    }
}

/**
 * Orchestrates the refreshing of the project count and the repeater list
 */
async function refreshProjectDashboard() {
    try {
        // Run data fetches in parallel for better performance
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
        console.error('[Project Explorer: v1.3.0] Dashboard refresh failed:', err);
    }
}

/**
 * Logic for the Project Repeater (#projectRepeater)
 * @param {Array} projects - Array of project objects from the database
 */
function renderProjectList(projects) {
    const $repeater = $w('#projectRepeater');
    
    if (!projects || projects.length === 0) {
        $repeater.collapse();
        return;
    }

    $repeater.expand();
    
    $repeater.onItemReady(($item, itemData) => {
        // Map data to repeater elements
        $item('#txtProjectTitle').text = itemData.title;
        $item('#txtProjectDescription').text = itemData.description;

        // Requirement: Clicking title navigates to CRUD/Editor page
        $item('#txtProjectTitle').onClick(() => {
            console.log(`[Project Explorer: v1.3.0] Navigating to editor for project: ${itemData._id}`);
            wixLocation.to(`/dashboard/project-editor?id=${itemData._id}`);
        });
    });

    // Assign data to trigger onItemReady
    $repeater.data = projects;
}

/**
 * Opens the creation modal and refreshes the list on success
 */
async function openProjectSettings() {
    try {
        const result = await wixWindow.openLightbox("New Project");

        if (result && result.updated) {
            console.log('[Project Explorer: v1.3.0] New project created. Refreshing UI.');
            await refreshProjectDashboard();
            showToaster("Project created successfully!", "success");
        }
    } catch (err) {
        console.error('[Project Explorer: v1.3.0] Error opening project modal:', err);
    }
}