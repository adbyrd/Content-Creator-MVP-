/**
 * Page: Profile Settings
 * Path: /dashboard/profilesetting.page.js
 * Description: Main dashboard controller for managing the Persistent Identity Hub.
 * Version: [cc-v2.1.0]
 */

import wixWindow from 'wix-window';
import { getProfile } from 'backend/services/profile.web';
import { showToaster } from 'public/utils/notifications';

const MODAL_COMPANY = 'settings-company';
const MODAL_CATEGORY = 'settings-category';
const MODAL_BRAND = 'settings-brand';
const MSG_UPDATE_SUCCESS = 'Success: Your company settings have been updated.';
const VERSION_TAG = '[cc-v2.1.0]';

let _isProcessing = false;
let _profileData = null;

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Profile Settings Page Initialized`);
    _profileData = await loadProfileData();
    bootUI();
});

function bootUI() {
    if ($w('#loader')) $w('#loader').collapse();
    wireEventHandlers();
}

async function loadProfileData() {
    try {
        const response = await getProfile();
        if (response.ok) {
            console.log(`${VERSION_TAG} Identity Hub payload loaded.`);
            return response.data;
        } else {
            console.warn(`${VERSION_TAG} Could not load profile:`, response.error);
            return null;
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Backend fetch failed:`, err);
        return null;
    }
}

function wireEventHandlers() {
    $w('#btnOpenCompany').onClick(() => {
        openSettingsModal(MODAL_COMPANY);
    });

    $w('#btnOpenCategory').onClick(() => {
        openSettingsModal(MODAL_CATEGORY);
    });

    $w('#btnOpenMedia').onClick(() => {
        openSettingsModal(MODAL_BRAND);
    });
}

async function openSettingsModal(modalId) {
    if (_isProcessing) return;

    try {
        console.log(`${VERSION_TAG} Opening ${modalId} with Context Injection...`);
        const result = await wixWindow.openLightbox(modalId, {
            profile: _profileData 
        });

        if (result && result.updated === true) {
            await handleUpdateSuccess();
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Error opening modal ${modalId}:`, err);
    }
}

async function handleUpdateSuccess() {
    _isProcessing = true;

    _profileData = await loadProfileData();

    showToaster(MSG_UPDATE_SUCCESS, "success");
    console.log(`${VERSION_TAG} UI Refreshed with new Identity Hub data.`);

    _isProcessing = false;
}