/**
 * Modal: Project Settings
 * Path: /page_code/modals/project-settings.modal.js
 * Description: Multi-step wizard for project creation with state-based UI control.
 * Version: [ PROJECT SETTINGS : v.1.1.2 ]
 */

import wixWindow from 'wix-window';
import { createProject } from 'backend/services/project.web';

const VERSION = '[ PROJECT SETTINGS : v.1.1.2 ]';
let _isSaving = false;

$w.onReady(function () {
    console.log(`${VERSION} Project Settings Modal Initialized`);
    initModal();
    wireEventHandlers();
});

function initModal() {
    $w('#setUpNewProject').changeState("projectDetails");
    $w('#btnNext').show();
    $w('#btnSave').hide();
    
    // UI Constraint: Limit input character length at the component level
    $w('#projectName').maxLength = 100;
}

function wireEventHandlers() {
    $w('#btnNext').onClick(() => {
        if (validateSummaryState()) {
            transitionToScope();
        }
    });
    $w('#btnSave').onClick(() => handleSave());
}

function transitionToScope() {
    console.log(`${VERSION} Advancing to Project Scope...`);

    $w('#setUpNewProject').changeState("projectScope");
    $w('#btnNext').hide();
    $w('#btnSave').show();
    
    console.log(`${VERSION} Transitioned to Project Scope. Navigation hidden.`);
}

/**
 * Validation for State #1 (Project Details)
 * Refactored for Ticket #2: Alphanumeric only, max 100 chars.
 */
function validateSummaryState() {
    const title = $w('#projectName').value;
    const desc = $w('#projectDescription').value;

    // Basic presence check
    if (!title || !desc) {
        console.warn(`${VERSION} Validation Failed: Project Name and Description are required.`);
        return false;
    }

    // Ticket #2: Length Restriction (100 Characters)
    if (title.length > 100) {
        console.warn(`${VERSION} Validation Failed: Title exceeds 100 characters.`);
        return false;
    }

    // Ticket #2: Alphanumeric Restriction (a-z, 0-9)
    // Allows spaces; remove \s if spaces are strictly prohibited.
    const alphanumericRegex = /^[a-z0-9 ]+$/i; 
    if (!alphanumericRegex.test(title)) {
        console.warn(`${VERSION} Validation Failed: Title must be alphanumeric only.`);
        return false;
    }

    return true;
}

/**
 * Validation for State #2 (Project Scope)
 */
function validateScopeState() {
    const fields = [
        $w('#projectGoal').value,
        $w('#projectOffer').value,
        $w('#projectAudience').value,
        $w('#projectMisconception').value
    ];

    const isValid = fields.every(value => value && value.trim() !== "");
    
    if (!isValid) {
        console.warn(`${VERSION} Validation Failed: All Scope fields are required.`);
    }
    
    return isValid;
}

/**
 * Orchestrates the data saving process
 */
async function handleSave() {
    if (_isSaving) return;
    
    if (!validateScopeState()) return;

    _isSaving = true;
    updateLoadingState(true);

    const projectData = {
        title: $w('#projectName').value,
        description: $w('#projectDescription').value,
        goal: $w('#projectGoal').value,
        offer: $w('#projectOffer').value,
        target_audience: $w('#projectAudience').value,
        misconception: $w('#projectMisconception').value
    };

    try {
        const response = await createProject(projectData);

        if (response.ok) {
            console.log(`${VERSION} Project created successfully.`);
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error(response.error || "Save failed");
        }
    } catch (err) {
        console.error(`${VERSION} Error during project save:`, err);
        updateLoadingState(false);
    }
}

/**
 * Updates UI to reflect background processing
 */
function updateLoadingState(isLoading) {
    if (isLoading) {
        $w('#btnSave').label = "Saving...";
        $w('#btnSave').disable();
    } else {
        $w('#btnSave').label = "Save";
        $w('#btnSave').enable();
        _isSaving = false;
    }
}