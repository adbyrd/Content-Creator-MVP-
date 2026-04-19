/**
 * Modal: Category & Audience Settings
 * Path: /page_code/modals/settings-category.modal.js
 * Version: [cc-v1.0.3]
 */

import wixWindow from 'wix-window';
import { updateProfile } from 'backend/services/profile.web';
import { getTaxonomy } from 'backend/services/category.web';
import { showToaster } from 'public/utils/notification';

const MSG_SAVING = "Saving...";

let _isSaving = false;
let _taxonomyCache = null;
let _profileContext = null;

$w.onReady(async function () {
    console.log('[cc-v1.0.3] Category Modal Initialized');
    await bootModal();
});

async function bootModal() {
    const context = wixWindow.lightbox.getContext();
    _profileContext = context?.profile || null;

    try {
        const response = await getTaxonomy();
        
        if (response.ok) {
            _taxonomyCache = response;
            setupDropdowns();
            
            if (_profileContext) {
                hydrateForm(_profileContext);
            }
        }else {
            console.error("[cc-v1.0.3] Taxonomy response not OK", res);
        }
    } catch (err) {
        console.error('[cc-v1.0.3] Boot failure:', err);
    }

    wireEventHandlers();
}

function setupDropdowns() {
    $w('#businessCategory').options = [
        { label: 'Select a category...', value: '' }, 
        ..._taxonomyCache.parentOptions
    ];

    $w('#customerBase').options = [
        { label: 'Select your customer base...', value: '' },
        { label: 'B2C (Business-to-Consumer)', value: 'b2c-business-to-consumer' },
        { label: 'B2B (Business-to-Business)', value: 'b2b-business-to-business' },
        { label: 'Mixed / Hybrid', value: 'mixed-hybrid-b2b-b2c' }
    ];

    $w('#businessSubCategory').options = [{ label: 'Select a sub-category...', value: '' }];
    $w('#businessSubCategory').disable();
}

function hydrateForm(profile) {
    if (profile.primaryCategory) {
        $w('#businessCategory').value = profile.primaryCategory;
        updateSubCategoryDropdown(profile.primaryCategory, profile.subCategory);
    }
    
    if (profile.customerType) {
        $w('#customerBase').value = profile.customerType;
    }
}

function updateSubCategoryDropdown(parentValue, selectedSubValue = '') {
    const children = _taxonomyCache.childrenByParent[parentValue] || [];
    
    if (children.length > 0) {
        $w('#businessSubCategory').options = [
            { label: 'Select a sub-category...', value: '' },
            ...children
        ];
        $w('#businessSubCategory').enable();
        
        if (selectedSubValue) {
            $w('#businessSubCategory').value = selectedSubValue;
        }
    } else {
        $w('#businessSubCategory').value = '';
        $w('#businessSubCategory').disable();
    }
}

function wireEventHandlers() {
    $w('#businessCategory').onChange((e) => {
        updateSubCategoryDropdown(e.target.value);
    });

    $w('#btnSave').onClick(() => handleSave());
}

async function handleSave() {
    if (_isSaving) return;
    
    _isSaving = true;
    $w('#btnSave').label = MSG_SAVING;
    $w('#btnSave').disable();

    try {
        const payload = {
            profile: {
                primaryCategory: $w('#businessCategory').value,
                subCategory: $w('#businessSubCategory').value,
                customerType: $w('#customerBase').value
            }
        };

        const response = await updateProfile(payload);

        if (response.ok) {
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error("Update failed");
        }
    } catch (err) {
        console.error(`[cc-v1.0.3] Save error:`, err);
        $w('#btnSave').label = "Save Settings";
        $w('#btnSave').enable();
        _isSaving = false;
    }
}

function validateForm() {
    if (!$w('#businessCategory').value) return false;
    if ($w('#businessSubCategory').enabled && !$w('#businessSubCategory').value) return false;
    if (!$w('#customerBase').value) return false;
    return true;
}