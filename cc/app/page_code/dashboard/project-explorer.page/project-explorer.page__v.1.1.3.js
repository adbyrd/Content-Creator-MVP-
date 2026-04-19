/**
 * Page: Project Explorer
 * Path: /page_code/dashboard/projectExplorer.page.js
 * Version: [ PROJECT EXPLORER : v.1.2.0 ]
 */

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { getMyProjects, getUserProjectCount } from 'backend/services/project.web';
import { showToaster } from 'public/utils/notification';

const VERSION = '[ PROJECT EXPLORER : v.1.2.0 ]';

$w.onReady(async function () {
    console.log(`${VERSION} Project Explorer Initialized`);

    // FIXED: onItemReady MUST be registered synchronously inside $w.onReady
    // before any async operations. Registering it inside an async callback
    // after $w.onReady resolves means Wix will not fire it for the initial
    // data binding, resulting in an empty repeater.
    $w('#projectRepeater').onItemReady(($item, itemData) => {
        $item('#txtProjectTitle').text = itemData.title || "Untitled Project";
        $item('#txtProjectDescription').text = itemData.description || "No description provided.";
        $item('#txtProjectTitle').onClick(() => {
            wixLocation.to(`/project/${slugify(itemData.title)}`);
        });
    });

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
        console.error(`${VERSION} Dashboard refresh failed:`, err);
    }
}

function renderProjectList(projects) {
    const $repeater = $w('#projectRepeater');

    if (!projects || projects.length === 0) {
        $repeater.data = [];
        $repeater.collapse();
        return;
    }

    // onItemReady is already registered — only assign data and show the repeater
    $repeater.data = projects;
    $repeater.expand();
}

async function openProjectSettings() {
    try {
        const result = await wixWindow.openLightbox("Project");

        if (result && result.updated) {
            console.log(`${VERSION} New project created. Refreshing UI.`);
            await refreshProjectDashboard();
            showToaster("Project created successfully!", "success");
        }
    } catch (err) {
        console.error(`${VERSION} Error opening project modal:`, err);
    }
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}