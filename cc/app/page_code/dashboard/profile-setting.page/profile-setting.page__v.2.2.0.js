/**
 * Page: Profile Settings
 * Path: /dashboard/profilesetting.page.js
 * Description: Main dashboard controller for managing the Persistent Identity Hub.
 * Version: [Profile Settings: v2.2.0]
 */

import wixWindow from 'wix-window';
import { getProfile } from 'backend/services/profile.web';
import { showToaster } from 'public/utils/notification';

let _profileData = null;

$w.onReady(async function () {
    _profileData = await loadProfileData();
    
    if (_profileData) {
        renderProfile(_profileData);
    }
    
    wireEventHandlers();
});

async function loadProfileData() {
    const response = await getProfile();
    return response.ok ? response.data : null;
}

function renderProfile(profile) {
    if (!profile) return;

    // Company Information
    $w('#displayLogo').src = profile.logo || "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";
    $w('#displayCompanyName').text = profile.companyName || "";
    $w('#displayCompanyURL').text = profile.companyURL || "";
    $w('#displayCompanyEmail').text = profile.companyEmail || "";
    $w('#displayCompanyPhone').text = profile.companyPhone || "";
    $w('#displayCompanyZipCode').text = profile.companyZipCode || "";
    $w('#displayCompanyDescription').text = profile.companyDescription || "";

    // Category & Audience 
    $w('#displayCategory').text = profile.primaryCategory || "";
    $w('#displaySubCategory').text = profile.subCategory || "";
    $w('#displayCustomerType').text = profile.customerType || "";
    
    console.log('[Profile Settings: v2.2.0] Profile UI rendered with latest data.');
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
            console.log(`[Profile Settings: v2.2.0] Update detected from ${modalId}. Refreshing UI.`);
            
            _profileData = await loadProfileData();

            renderProfile(_profileData);

            showToaster("Settings updated successfully.", "success");
        }
    } catch (err) {
        console.error(`[Profile Settings: v2.2.0] Error handling modal close:`, err);
    }
}