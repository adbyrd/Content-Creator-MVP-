/**
 * Modal: Company Settings
 * Path: /modals/settings-company.modal.js
 * Version: [cc-v2.0.1]
 */

import wixWindow from 'wix-window';
import { updateProfile } from 'backend/services/profile.web';
import { validateRequired, validateEmail, validateUrl } from 'public/utils/validation.js';

const MSG_ERROR_GENERIC = "We couldn't update your settings. Please check the form and try again.";
const MSG_SAVING = "Saving...";

let _isSaving = false;
let _formData = {};

$w.onReady(function () {
    console.log('[cc-v2.0.1] Company Settings Modal Initialized');
    bootModal();
});

async function bootModal() {
    const context = wixWindow.lightbox.getContext();
    if (context && context.profile) {
        hydrateForm(context.profile);
    }
    
    wireEventHandlers();
}

function hydrateForm(profile) {
    $w('#companyName').value = data.comanyName || "";
    $w('#companyURL').value = data.companyURL || "";
    $w('#companyDescription').value = data.comanyDescription || "";
    $w('#companyZipCode').value = data.comanyZipCode || "";
    $w('#companyEmail').value = data.companyEmail || "";
    $w('#companyPhone').value = data.companyPhone || "";
}

function wireEventHandlers() {
    $w('#btnSaveCompany').onClick(() => handleSave());
    $w('#btnCloseModal').onClick(() => wixWindow.lightbox.close());
}

async function handleSave() {
    if (_isSaving) return;

    const validation = validateForm();
    if (!validation.isValid) {
        showError(validation.message);
        return;
    }

    try {
        toggleLoading(true);
        
        const payload = {
            profile: {
                comanyName: $w('#companyName').value,
                companyURL: $w('#companyURL').value,
                comanyDescription: $w('#companyDescription').value,
                comanyZipCode: $w('#companyZipCode').value,
                companyEmail: $w('#companyEmail').value,
                companyPhone: $w('#companyPhone').value
            }
        };

        console.log('[cc-v2.0.1] Submitting profile update...');
        const response = await updateProfile(payload);

        if (response.ok) {
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error(response.error?.message || MSG_ERROR_GENERIC);
        }

    } catch (err) {
        console.error(`[cc-v2.0.1] Save failed:`, err);
        showError(err.message);
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

function showError(message) {
    const errEl = $w('#errorMsgCompanyDetails');
    if (errEl) {
        errEl.text = message;
        errEl.expand();
        setTimeout(() => errEl.collapse(), 5000);
    }
}