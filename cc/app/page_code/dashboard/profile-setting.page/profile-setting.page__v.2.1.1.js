/**
 * Page: Profile Settings
 * Path: /dashboard/profilesetting.page.js
 * Description: Main dashboard controller for managing the Persistent Identity Hub.
 * Version: [cc-v2.1.1]
 */

import wixWindow from 'wix-window';
import { getProfile } from 'backend/services/profile.web';
import { showToaster } from 'public/utils/notification';

let _profileData = null;

$w.onReady(async function () {
    _profileData = await loadProfileData();
    wireEventHandlers();
});

async function loadProfileData() {
    const response = await getProfile();
    return response.ok ? response.data : null;
}

function wireEventHandlers() {
    $w('#btnCompany').onClick(() => openSettingsModal('Company'));
    $w('#btnCategory').onClick(() => openSettingsModal('Category'));
    $w('#btnMedia').onClick(() => openSettingsModal('Media'));
}

async function openSettingsModal(modalId) {
    try {
        const result = await wixWindow.openLightbox(modalId, { profile: _profileData });

        if (result && result.updated) {
            console.log(`[cc-v2.1.1] Update detected from ${modalId}. Triggering Toaster.`);
            
            _profileData = await loadProfileData();

            showToaster("Settings updated successfully.", "success");
        }
    } catch (err) {
        console.error(`[cc-v2.1.1] Error handling modal close:`, err);
    }
}