/**
 * LIGHTBOX: Company Details Popup
 * Handles Company Name, URL, Description, Zip Code, Email, and Phone.
 * @version 1.1.0
 */

import wixWindowFrontend from 'wix-window-frontend';
// PROVIDE Backend Service

$w.onReady(function () {
    console.log('[cc-popupCompany-v1.1.0] Initializing Company Details Editor...');

    const context = wixWindowFrontend.lightbox.getContext();
    
    hydrateForm(context);

    $w('#btnCancel').onClick(() => {
        wixWindowFrontend.lightbox.close(false);
    });

    $w('#btnSave').onClick(async () => {
        await handleSave();
    });
});

function hydrateForm(data) {
    if (!data) return;
    $w('#companyName').value = data.comanyName || "";
    $w('#companyURL').value = data.companyURL || "";
    $w('#companyDescription').value = data.comanyDescription || "";
    $w('#companyZipCode').value = data.comanyZipCode || "";
    $w('#companyEmail').value = data.companyEmail || "";
    $w('#companyPhone').value = data.companyPhone || "";
}

async function handleSave() {
    if (!validateForm()) {
        return;
    }

    $w('#btnSave').disable();
    $w('#btnSave').label = "Saving...";

    const payload = {
        comanyName: $w('#companyName').value,
        companyURL: $w('#companyURL').value,
        comanyDescription: $w('#companyDescription').value,
        comanyZipCode: $w('#companyZipCode').value,
        companyEmail: $w('#companyEmail').value,
        companyPhone: $w('#companyPhone').value
    };

    try {
        await saveMemberBusinessProfile(payload);
        
        console.log('[cc-popupCompany-v1.1.0] Company details persisted successfully.');
        wixWindowFrontend.lightbox.close(true);
        
    } catch (err) {
        console.error('[cc-popupCompany-v1.1.0] Save failed:', err);
        $w('#btnSave').enable();
        $w('#btnSave').label = "Save Changes";
    }
}

function validateForm() {
    const requiredFields = ['#companyName', '#companyURL'];
    let allValid = true;

    requiredFields.forEach(selector => {
        if (!$w(selector).valid) {
            allValid = false;
        }
    });

    return allValid;
}