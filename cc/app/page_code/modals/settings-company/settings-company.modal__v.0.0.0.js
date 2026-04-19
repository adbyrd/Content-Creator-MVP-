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
    $w('#ccCompanyName').value = data.ccComanyName || "";
    $w('#ccCompanyURL').value = data.ccCompanyURL || "";
    $w('#ccCompanyDescription').value = data.ccComanyDescription || "";
    $w('#ccCompanyZipCode').value = data.ccComanyZipCode || "";
    $w('#ccCompanyEmail').value = data.ccCompanyEmail || "";
    $w('#ccCompanyPhone').value = data.ccCompanyPhone || "";
}

async function handleSave() {
    if (!validateForm()) {
        return;
    }

    $w('#btnSave').disable();
    $w('#btnSave').label = "Saving...";

    const payload = {
        ccComanyName: $w('#ccCompanyName').value,
        ccCompanyURL: $w('#ccCompanyURL').value,
        ccComanyDescription: $w('#ccCompanyDescription').value,
        ccComanyZipCode: $w('#ccCompanyZipCode').value,
        ccCompanyEmail: $w('#ccCompanyEmail').value,
        ccCompanyPhone: $w('#ccCompanyPhone').value
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
    const requiredFields = ['#ccCompanyName', '#ccCompanyURL'];
    let allValid = true;

    requiredFields.forEach(selector => {
        if (!$w(selector).valid) {
            allValid = false;
        }
    });

    return allValid;
}