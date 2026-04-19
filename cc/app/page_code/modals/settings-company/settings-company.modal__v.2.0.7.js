/**
 * Modal: Company Settings
 * Path: /modals/settings-company.modal.js
 * Version: [ COMPANY SETTINGS : v.2.0.7 ]
 */

import wixWindow from 'wix-window';
import { updateProfile } from 'backend/services/profile.web';
import { validateEmail, validateUrl } from 'public/utils/validation.js';
import { showModalError } from 'public/utils/ui.js';

const VERSION = '[ COMPANY SETTINGS : v.2.0.7 ]';
const MSG_ERROR_GENERIC = "We couldn't update your settings. Please check the form and try again.";
const MSG_SAVING = "Saving...";

let _isSaving = false;

$w.onReady(function () {
    console.log(`${VERSION} Company Settings Modal Initialized`);
    bootModal();
});

async function bootModal() {
    const context = wixWindow.lightbox.getContext();
    
    if (context && context.profile) {
        console.log(`${VERSION} Context detected. Hydrating form fields...`);
        hydrateForm(context.profile);
    } else {
        console.warn(`${VERSION} No profile context provided to modal.`);
    }
    
    wireEventHandlers();
}

function hydrateForm(profile) {
    $w('#companyName').value = profile.companyName || "";
    $w('#companyURL').value = profile.companyURL || "";
    $w('#companyDescription').value = profile.companyDescription || "";
    $w('#companyZipCode').value = profile.companyZipCode || "";
    $w('#companyEmail').value = profile.companyEmail || "";
    $w('#companyPhone').value = profile.companyPhone || "";

    console.log(`${VERSION} Hydration complete for:`, profile.companyName);
}

function wireEventHandlers() {
    $w('#btnSave').onClick(() => handleSave());
    $w('#btnClose').onClick(() => wixWindow.lightbox.close());
}

async function handleSave() {
    if (_isSaving) return;

    const validation = validateForm();
    if (!validation.isValid) {
        showModalError(validation.message, $w);
        return;
    }

    try {
        toggleLoading(true);
        
        const payload = {
            profile: {
                companyName: $w('#companyName').value,
                companyURL: $w('#companyURL').value,
                companyDescription: $w('#companyDescription').value,
                companyZipCode: $w('#companyZipCode').value,
                companyEmail: $w('#companyEmail').value,
                companyPhone: $w('#companyPhone').value
            }
        };

        const response = await updateProfile(payload);

        if (response.ok) {
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error(response.error?.message || MSG_ERROR_GENERIC);
        }

    } catch (err) {
        console.error(`${VERSION} Save failed:`, err);
        showModalError(err.message, $w);
    } finally {
        toggleLoading(false);
    }
}

function validateForm() {
    if (!$w('#companyName').value) return { isValid: false, message: "Company Name is required." };
    if (!validateEmail($w('#companyEmail').value)) return { isValid: false, message: "A valid email is required." };
    if (!validateUrl($w('#companyURL').value)) return { isValid: false, message: "A valid website URL is required." };
    
    return { isValid: true };
}

function toggleLoading(isLoading) {
    _isSaving = isLoading;
    const btn = $w('#btnSave');
    
    if (isLoading) {
        btn.label = MSG_SAVING;
        btn.disable();
    } else {
        btn.label = "Save Changes";
        btn.enable();
    }
}