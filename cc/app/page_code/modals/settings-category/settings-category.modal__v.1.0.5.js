/**
 * Modal: Category & Audience Settings
 * Path: /page_code/modals/settings-category.modal.js
 * Version: [ CATEGORY & AUDIENCE SETTINGS : v.1.0.5 ]
 */

import wixWindow from 'wix-window';
import { updateProfile } from 'backend/services/profile.web';
import { getTaxonomy } from 'backend/services/category.web';

const VERSION = '[ CATEGORY & AUDIENCE SETTINGS : v.1.0.5 ]';
const MSG_SAVING = "Saving...";

let _isSaving = false;
let _taxonomyCache = null;
let _profileContext = null;

$w.onReady(async function () {
    const context = wixWindow.lightbox.getContext();
    _profileContext = context?.profile || null;

    try {
        const res = await getTaxonomy();
        
        if (res && res.ok) {
            _taxonomyCache = res;
            
            // 1. Initial UI Setup
            setupDropdowns();
            
            // 2. Attach Listeners BEFORE hydration
            wireEventHandlers();
            
            // 3. Hydrate with existing data
            if (_profileContext) {
                hydrateForm(_profileContext);
            }
        } else {
            console.error(`${VERSION} Taxonomy failed to load.`, res);
        }
    } catch (err) {
        console.error(`${VERSION} Modal Boot Error:`, err);
    }
});

function setupDropdowns() {
    // Populate Primary Category
    $w('#businessCategory').options = [
        { label: 'Select a category...', value: '' }, 
        ...(_taxonomyCache?.parentOptions || [])
    ];

    // Populate Customer Base
    $w('#customerBase').options = [
        { label: 'Select your customer base...', value: '' },
        { label: 'B2C (Business-to-Consumer)', value: 'b2c' },
        { label: 'B2B (Business-to-Business)', value: 'b2b' },
        { label: 'Mixed / Hybrid', value: 'mixed' }
    ];

    // Reset Sub-category to default disabled state
    resetSubCategory();
}

function resetSubCategory() {
    $w('#businessSubCategory').options = [{ label: 'Select a sub-category...', value: '' }];
    $w('#businessSubCategory').value = '';
    $w('#businessSubCategory').disable();
}

/**
 * CORE LOGIC: Orchestrates the state of the sub-category dropdown
 */
function updateSubCategoryDropdown(parentValue, selectedSubValue = '') {
    if (!parentValue || !_taxonomyCache) {
        resetSubCategory();
        return;
    }

    const children = _taxonomyCache.childrenByParent[parentValue] || [];
    
    if (children.length > 0) {
        // 1. Map new options
        $w('#businessSubCategory').options = [
            { label: 'Select a sub-category...', value: '' },
            ...children
        ];
        
        // 2. Enable the element
        $w('#businessSubCategory').enable();
        
        // 3. Set value (if hydrating or if valid selection exists)
        if (selectedSubValue) {
            $w('#businessSubCategory').value = selectedSubValue;
        } else {
            $w('#businessSubCategory').value = '';
        }
    } else {
        resetSubCategory();
    }
}

function hydrateForm(profile) {
    if (profile.primaryCategory) {
        $w('#businessCategory').value = profile.primaryCategory;
        // Trigger logic to enable and fill sub-dropdown based on the primary value
        updateSubCategoryDropdown(profile.primaryCategory, profile.subCategory);
    }
    
    if (profile.customerType) {
        $w('#customerBase').value = profile.customerType;
    }
}

function wireEventHandlers() {
    // Listener for category changes
    $w('#businessCategory').onChange((e) => {
        const selectedParent = e.target.value;
        updateSubCategoryDropdown(selectedParent);
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
        console.error(`${VERSION} Save error:`, err);
        $w('#btnSave').label = "Save Settings";
        $w('#btnSave').enable();
        _isSaving = false;
    }
}