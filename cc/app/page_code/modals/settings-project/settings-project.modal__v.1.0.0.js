/**
 * Modal: Project Settings
 * Path: /page_code/modals/project-settings.modal.js
 * Version: [cc-v1.0.0]
 */

import wixWindow from 'wix-window';
import { createProject } from 'backend/services/project.web';

let _isSaving = false;

$w.onReady(function () {
    // Ensure we start at the first state
    $w('#msbProject').changeState("ProjectSummary");

    wireEventHandlers();
});

function wireEventHandlers() {
    // State 1 -> State 2
    $w('#btnNext').onClick(() => {
        if (validateState1()) {
            $w('#msbProject').changeState("ProjectScope");
        }
    });

    // Save Data
    $w('#btnSave').onClick(() => handleSave());
}

function validateState1() {
    const title = $w('#projectName').value;
    const desc = $w('#projectDescription').value;

    if (!title || !desc) {
        // Simple validation feedback (standards suggest better UI, but here we ensure data integrity)
        console.warn('[cc-v1.0.0] Summary fields required.');
        return false;
    }
    return true;
}

function validateState2() {
    const goal = $w('#projectGoal').value;
    const offer = $w('#projectOffer').value;
    const audience = $w('#projectAudience').value;
    const misconception = $w('#projectMisconception').value;

    return (goal && offer && audience && misconception);
}

async function handleSave() {
    if (_isSaving) return;
    if (!validateState2()) {
        console.warn('[cc-v1.0.0] All Scope fields are required.');
        return;
    }

    _isSaving = true;
    $w('#btnSave').label = "Saving...";
    $w('#btnSave').disable();

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
            wixWindow.lightbox.close({ updated: true });
        } else {
            throw new Error(response.error);
        }
    } catch (err) {
        console.error('[cc-v1.0.0] Failed to save project:', err);
        $w('#btnSave').label = "Save";
        $w('#btnSave').enable();
        _isSaving = false;
    }
}