/**
 * Modal: Company Settings
 * Path: /modals/settings-company.modal.js
 * Version: [cc-v2.0.0]
 */

import wixWindow from 'wix-window';
import { updateProfile } from 'backend/services/profile.web';
import { validateRequired, validateEmail, validateUrl } from 'public/utils/validation';

const MSG_ERROR_GENERIC = "We couldn't update your settings. Please check the form and try again.";
const MSG_SAVING = "Saving...";

let _isSaving = false;
let _formData = {};

$w.onReady(function () {
    console.log('[cc-v2.0.0] Company Settings Modal Initialized');
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
    $w('#iptCompanyName').value = profile.companyName || '';
    $w('#iptCompanyEmail').value = profile.companyEmail || '';
    $w('#iptZipCode').value = profile.zipCode || '';
    $w('#iptWebsiteUrl').value = profile.websiteUrl || '';
    $w('#txtCompanyDescription').value = profile.companyDescription || '';
    $w('#drpPreferredPlatform').value = profile.preferredPlatform || 'Instagram';
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
                companyName: $w('#iptCompanyName').value,
                companyEmail: $w('#iptCompanyEmail').value,
                zipCode: $w('#iptZipCode').value,
                websiteUrl: $w('#iptWebsiteUrl').value,
                companyDescription: $w('#txtCompanyDescription').value,
                preferredPlatform: $w('#drpPreferredPlatform').value
            }
        };

        console.log('[cc-v2.0.0] Submitting profile update...');
        const response = await updateProfile(payload);

        if (response.ok) {
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error(response.error?.message || MSG_ERROR_GENERIC);
        }

    } catch (err) {
        console.error(`[cc-v2.0.0] Save failed:`, err);
        showError(err.message);
    } finally {
        toggleLoading(false);
    }
}

function validateForm() {
    if (!$w('#iptCompanyName').value) return { isValid: false, message: "Company Name is required." };
    if (!validateEmail($w('#iptCompanyEmail').value)) return { isValid: false, message: "A valid email is required." };
    if (!validateUrl($w('#iptWebsiteUrl').value)) return { isValid: false, message: "A valid website URL is required." };
    
    return { isValid: true };
}

function toggleLoading(isLoading) {
    _isSaving = isLoading;
    const btn = $w('#btnSaveCompany');
    
    if (isLoading) {
        btn.label = MSG_SAVING;
        btn.disable();
    } else {
        btn.label = "Save Changes";
        btn.enable();
    }
}

function showError(message) {
    const errEl = $w('#txtErrorMessage');
    if (errEl) {
        errEl.text = message;
        errEl.expand();
        setTimeout(() => errEl.collapse(), 5000);
    }
}