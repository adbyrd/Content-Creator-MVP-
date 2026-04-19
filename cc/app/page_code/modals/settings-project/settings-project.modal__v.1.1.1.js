/**
 * Modal: Project Settings
 * Path: /page_code/modals/project-settings.modal.js
 * Description: Multi-step wizard for project creation with state-based UI control.
 * Version: [cc-v1.1.1]
 */

import wixWindow from 'wix-window';
import { createProject } from 'backend/services/project.web';

let _isSaving = false;

$w.onReady(function () {
    initModal();
    wireEventHandlers();
});

function initModal() {
    $w('#setUpNewProject').changeState("projectDetails");
    $w('#btnNext').show();
    $w('#btnSave').hide();
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
    console.log('[cc-v1.1.1] Advancing to Project Scope...');

    $w('#setUpNewProject').changeState("projectScope");
    $w('#btnNext').hide();
    $w('#btnSave').show();
    
    console.log('[cc-v1.1.1] Transitioned to Project Scope. Navigation hidden.');
}

function validateSummaryState() {
    const title = $w('#projectName').value;
    const desc = $w('#projectDescription').value;

    if (!title || !desc) {
        console.warn('[cc-v1.1.1] Validation Failed: Project Name and Description are required.');
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
        console.warn('[cc-v1.1.1] Validation Failed: All Scope fields are required.');
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
            console.log('[cc-v1.1.1] Project created successfully.');
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error(response.error || "Save failed");
        }
    } catch (err) {
        console.error('[cc-v1.1.1] Error during project save:', err);
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