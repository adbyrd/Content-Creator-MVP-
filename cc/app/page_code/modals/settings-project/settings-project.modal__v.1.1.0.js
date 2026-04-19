/**
 * Modal: Project Settings
 * Path: /page_code/modals/project-settings.modal.js
 * Description: Multi-step wizard for project creation with state-based UI control.
 * Version: [cc-v1.1.0]
 */

import wixWindow from 'wix-window';
import { createProject } from 'backend/services/project.web';

let _isSaving = false;

$w.onReady(function () {
    initModal();
    wireEventHandlers();
});

/**
 * Initializes the modal state and UI visibility
 */
function initModal() {
    // Ensure we start at the first state and 'Next' is visible
    $w('#setUpNewProject').changeState("projectDetails");
    $w('#btnNext').show();
    $w('#btnSave').hide(); // Hide Save until the final state
}

function wireEventHandlers() {
    // State Transition: Summary -> Scope
    $w('#btnNext').onClick(() => {
        if (validateSummaryState()) {
            transitionToScope();
        }
    });

    // Final Submission
    $w('#btnSave').onClick(() => handleSave());
}

/**
 * Handles the UI transition between MultiStateBox states
 */
function transitionToScope() {
    $w('#setUpNewProject').changeState("projectDetails");
    
    // Ticket Requirement: Hide Next button on State #2
    $w('#btnNext').hide();
    $w('#btnSave').show();
    
    console.log('[cc-v1.1.0] Transitioned to Project Scope. Navigation hidden.');
}

/**
 * Validation for State #1 (Project Summary)
 */
function validateSummaryState() {
    const title = $w('#projectName').value;
    const desc = $w('#projectDescription').value;

    if (!title || !desc) {
        console.warn('[cc-v1.1.0] Validation Failed: Project Name and Description are required.');
        // Note: Standards suggest adding visual 'invalid' states to inputs here
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
        console.warn('[cc-v1.1.0] Validation Failed: All Scope fields are required.');
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
        audience: $w('#projectAudience').value,
        misconception: $w('#projectMisconception').value
    };

    try {
        const response = await createProject(projectData);

        if (response.ok) {
            console.log('[cc-v1.1.0] Project created successfully.');
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error(response.error || "Save failed");
        }
    } catch (err) {
        console.error('[cc-v1.1.0] Error during project save:', err);
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