/**
 * Modal: Category & Audience Settings
 * Path: /page_code/modals/settings-category.modal.js
 * Version: [cc-v1.0.0]
 */

import wixWindow from 'wix-window';
import { updateProfile } from 'backend/services/profile.web';
import { getTaxonomy } from 'backend/services/category.web';
import { showModalError } from 'public/utils/ui.js';

const MSG_SAVING = "Saving...";
const MSG_SAVE_SUCCESS = "Category settings updated.";

let _isSaving = false;
let _taxonomyCache = null;
let _profileContext = null;

$w.onReady(async function () {
    console.log('[cc-v1.0.0] Category Modal Initialized');
    await bootModal();
});

async function bootModal() {
    const context = wixWindow.lightbox.getContext();
    _profileContext = context?.profile || null;

    // 1. Fetch Taxonomy data first (Required for dropdown options)
    try {
        _taxonomyCache = await getTaxonomy();
        setupDropdowns();
    } catch (err) {
        console.error('[cc-v1.0.0] Failed to load taxonomy:', err);
    }

    // 2. Hydrate form if profile exists
    if (_profileContext) {
        hydrateForm(_profileContext);
    }

    wireEventHandlers();
}

function setupDropdowns() {
    // Populate Primary Categories
    $w('#businessCategory').options = [
        { label: 'Select a category...', value: '', disabled: true },
        ..._taxonomyCache.parentOptions
    ];

    // Populate Customer Base (Hardcoded options from standards)
    $w('#customerBase').options = [
        { label: 'Select your customer base...', value: '', disabled: true },
        { label: 'B2C (Business-to-Consumer)', value: 'b2c-business-to-consumer' },
        { label: 'B2B (Business-to-Business)', value: 'b2b-business-to-business' },
        { label: 'Mixed / Hybrid', value: 'mixed-hybrid-b2b-b2c' }
    ];
}

function hydrateForm(profile) {
    console.log('[cc-v1.0.0] Hydrating Category Form');
    
    if (profile.primaryCategory) {
        $w('#businessCategory').value = profile.primaryCategory;
        // Trigger sub-category population based on saved primary category
        updateSubCategoryDropdown(profile.primaryCategory, profile.subCategory);
    }
    
    if (profile.customerType) {
        $w('#customerBase').value = profile.customerType;
    }
}

function updateSubCategoryDropdown(parentSlug, existingSubValue = '') {
    const children = _taxonomyCache.childrenByParent[parentSlug] || [];
    
    if (children.length > 0) {
        $w('#businessSubCategory').options = [
            { label: 'Select a sub-category...', value: '', disabled: true },
            ...children
        ];
        $w('#businessSubCategory').enable();
        
        if (existingSubValue) {
            $w('#businessSubCategory').value = existingSubValue;
        }
    } else {
        $w('#businessSubCategory').disable();
        $w('#businessSubCategory').value = '';
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

    const validation = validateForm();
    if (!validation.isValid) {
        showModalError(validation.message, $w);
        return;
    }

    toggleLoading(true);

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
            // Return updated signal to parent page to trigger toaster
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error(response.error?.message || "Update failed");
        }
    } catch (err) {
        console.error(`[cc-v1.0.0] Save error:`, err);
        showModalError("Could not save categories. Please try again.", $w);
    } finally {
        toggleLoading(false);
    }
}

function validateForm() {
    if (!$w('#businessCategory').value) return { isValid: false, message: "Please select a primary category." };
    if ($w('#businessSubCategory').enabled && !$w('#businessSubCategory').value) {
        return { isValid: false, message: "Please select a sub-category." };
    }
    return { isValid: true };
}

function toggleLoading(isLoading) {
    _isSaving = isLoading;
    const btn = $w('#btnSave');
    btn.label = isLoading ? MSG_SAVING : "Save Settings";
    isLoading ? btn.disable() : btn.enable();
}