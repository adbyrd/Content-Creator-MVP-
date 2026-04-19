/**
 * CATEGORY
 * Legacy version of the Business Settings modal focused on category and customer base selection.
 * @version 0.0.1
 */

import wixWindowFrontend from 'wix-window-frontend';
import { getTaxonomy } from 'backend/categoryService.web';

const CUSTOMER_BASE_OPTIONS = [
    { label: 'Select your customer base...', value: '', disabled: true },
    { label: 'B2C (Business-to-Consumer)', value: 'b2c-business-to-consumer' },
    { label: 'B2B (Business-to-Business)', value: 'b2b-business-to-business' },
    { label: 'B2B2C (Business-to-Business-to-Consumer)', value: 'b2b2c-business-to-business-to-consumer' },
    { label: 'B2G / Government', value: 'b2g-government' },
    { label: 'Non-Profit / NGO / Charities', value: 'non-profit-ngo-charities' },
    { label: 'Internal / Employees', value: 'internal-employees' },
    { label: 'Mixed / Hybrid (B2B & B2C)', value: 'mixed-hybrid-b2b-b2c' }
];

let _taxonomyCache = null;

$w.onReady(async function () {
    console.log('[cc-popup-v1.0.0] Initializing Business Settings...');
    
    const context = wixWindowFrontend.lightbox.getContext();
    
    bootUI(context);
    await loadTaxonomyData(context);

    $w('#businessCategory').onChange((e) => {
        updateSubCategoryDropdown(e.target.value);
    });

    $w('#btnCancel').onClick(() => {
        wixWindowFrontend.lightbox.close(false);
    });

    $w('#btnSave').onClick(async () => {
        await handleSave();
    });
});

function bootUI(context) {
    $w('#customerBase').options = CUSTOMER_BASE_OPTIONS;
    
    if (context?.customerType) {
        $w('#customerBase').value = context.customerType;
    }
}

async function loadTaxonomyData(context) {
    try {
        _taxonomyCache = await getTaxonomy();
        
        if (_taxonomyCache) {
            $w('#businessCategory').options = [
                { label: 'Select a category...', value: '', disabled: true }, 
                ..._taxonomyCache.parentOptions
            ];

            if (context?.businessCategory) {
                $w('#businessCategory').value = context.businessCategory;
                updateSubCategoryDropdown(context.businessCategory, context.businessSubCategory);
            }
        }
    } catch (err) {
        console.error('[cc-popup-v1.0.0] Taxonomy load failed:', err);
    }
}

function updateSubCategoryDropdown(parentSlug, existingSubValue = '') {
    if (!_taxonomyCache || !parentSlug) return;

    const children = _taxonomyCache.childrenByParent[parentSlug] || [];
    
    $w('#businessSubCategory').options = [
        { label: 'Select a sub-category...', value: '', disabled: true }, 
        ...children
    ];
    
    $w('#businessSubCategory').enable();

    if (existingSubValue) {
        $w('#businessSubCategory').value = existingSubValue;
    } else {
        $w('#businessSubCategory').value = '';
    }
}

async function handleSave() {
    if (!validateForm()) return;

    $w('#btnSave').disable();
    $w('#btnSave').label = "Saving...";

    const payload = {
        businessCategory: $w('#ccBusinessCategory').value,
        businessSubCategory: $w('#ccBusinessSubCategory').value,
        customerType: $w('#ccCustomerBase').value
    };

    try {
        await saveMemberBusinessProfile(payload);
        console.log('[cc-popup-v1.0.0] Business settings saved successfully.');
        wixWindowFrontend.lightbox.close(true); 
    } catch (error) {
        console.error('[cc-popup-v1.0.0] Save failed:', error);
        $w('#btnSave').enable();
        $w('#btnSave').label = "Save Settings";
    }
}

function validateForm() {
    let isValid = true;
    const fields = ['#businessCategory', '#businessSubCategory', '#customerBase'];
    
    fields.forEach(selector => {
        if (!$w(selector).valid) {
            isValid = false;
        }
    });
    
    return isValid;
}