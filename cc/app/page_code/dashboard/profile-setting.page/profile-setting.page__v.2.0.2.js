/**
 * Page: Profile Settings
 * Path: /dashboard/profilesetting.page.js
 * Version: [cc-v2.0.1]
 */

import wixLocation from 'wix-location'; 
import wixWindow from 'wix-window';
import { showToaster } from 'public/utils/notification.js';

const MODAL_COMPANY = 'settings-company';
const MODAL_CATEGORY = 'settings-category';
const MODAL_BRAND = 'settings-brand';
const MSG_UPDATE_SUCCESS = 'Success: Your company settings have been updated.';

let _isProcessing = false;

$w.onReady(function () {
    console.log('[cc-v2.0.1] Profile Settings Page Initialized');
    bootUI();
});

function bootUI() {
    wireEventHandlers();
}

function wireEventHandlers() {
    // Company Settings Button
    $w('#btnOpenCompany').onClick(() => {
        openSettingsModal(MODAL_COMPANY);
    });

    // Category Settings Button
    $w('#btnOpenCategory').onClick(() => {
        openSettingsModal(MODAL_CATEGORY);
    });

    // Media/Brand Settings Button
    $w('#btnOpenMedia').onClick(() => {
        openSettingsModal(MODAL_BRAND);
    });
}

async function openSettingsModal(modalId) {
    if (_isProcessing) return;

    try {
        console.log(`[cc-v2.0.1] Opening modal: ${modalId}`);
        const result = await wixWindow.openLightbox(modalId);

        if (result && result.updated === true) {
            handleUpdateSuccess();
        }
    } catch (err) {
        console.error(`[cc-v2.0.1] Error opening modal ${modalId}:`, err);
    }
}

function handleUpdateSuccess() {
    _isProcessing = true;
    showToaster(MSG_UPDATE_SUCCESS, "success");

    console.log('[cc-v2.0.1] Profile updated. Triggering page reload.');

    setTimeout(() => {
        wixLocation.to(wixLocation.url); 
    }, 4000);
}

export function debugPageState() {
    return {
        isProcessing: _isProcessing,
        version: "2.0.0",
        timestamp: new Date().toISOString()
    };
}