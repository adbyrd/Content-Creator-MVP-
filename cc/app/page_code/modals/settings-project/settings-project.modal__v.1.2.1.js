/**
 * Modal: Project Settings
 * Path: /page_code/modals/project-settings.modal.js
 * Description: Multi-step wizard for project creation with state-based UI control.
 * Version: [ PROJECT SETTINGS : v.1.2.1 ]
 */

import wixWindow from 'wix-window';
import { createProject } from 'backend/services/project.web';

const VERSION = '[ PROJECT SETTINGS : v.1.2.1 ]';

// Shared regex: alphanumeric + spaces only
const ALPHANUMERIC_REGEX = /^[a-z0-9 ]*$/i;

// Character limits
const MAX_TITLE_LENGTH = 70;
const MAX_DESC_LENGTH  = 250;

const MSG_INVALID_TITLE       = "Project name cannot contain special characters.";
const MSG_INVALID_DESCRIPTION = "Project description cannot contain special characters.";
const MSG_INVALID_BOTH        = "Project name and description cannot contain special characters.";
const MSG_TITLE_TOO_LONG      = `Project name cannot exceed ${MAX_TITLE_LENGTH} characters.`;
const MSG_DESC_TOO_LONG       = `Project description cannot exceed ${MAX_DESC_LENGTH} characters.`;

let _isSaving = false;

$w.onReady(function () {
    initModal();
    wireEventHandlers();
});

// ─── INIT ────────────────────────────────────────────────────────────────────

function initModal() {
    $w('#setUpNewProject').changeState("projectDetails");
    $w('#btnNext').show();
    $w('#btnSave').hide();

    // UI Constraint: Enforce character limits at the component level
    $w('#projectName').maxLength        = MAX_TITLE_LENGTH;
    $w('#projectDescription').maxLength = MAX_DESC_LENGTH;

    // Ensure error element is hidden on boot
    clearInlineError();
}

// ─── EVENT WIRING ─────────────────────────────────────────────────────────────

function wireEventHandlers() {
    // Real-time inline validation — fires on every keystroke
    $w('#projectName').onInput(() => validateFieldsInline());
    $w('#projectDescription').onInput(() => validateFieldsInline());

    $w('#btnNext').onClick(() => {
        if (validateSummaryState()) {
            transitionToScope();
        }
    });

    $w('#btnSave').onClick(() => handleSave());
}

// ─── REAL-TIME INLINE VALIDATION ─────────────────────────────────────────────

/**
 * Checks both Step 1 fields for special characters and length limits on every input event.
 * Shows a contextual error instantly; clears it the moment the input is valid.
 * Priority: length errors surface before special character errors.
 */
function validateFieldsInline() {
    const title = $w('#projectName').value;
    const desc  = $w('#projectDescription').value;

    // Length checks take priority
    if (title.length > MAX_TITLE_LENGTH) {
        showInlineError(MSG_TITLE_TOO_LONG);
        return;
    }

    if (desc.length > MAX_DESC_LENGTH) {
        showInlineError(MSG_DESC_TOO_LONG);
        return;
    }

    // Special character checks
    const titleInvalid = !ALPHANUMERIC_REGEX.test(title);
    const descInvalid  = !ALPHANUMERIC_REGEX.test(desc);

    if (titleInvalid && descInvalid) {
        showInlineError(MSG_INVALID_BOTH);
    } else if (titleInvalid) {
        showInlineError(MSG_INVALID_TITLE);
    } else if (descInvalid) {
        showInlineError(MSG_INVALID_DESCRIPTION);
    } else {
        clearInlineError();
    }
}

// ─── INLINE ERROR HELPERS ─────────────────────────────────────────────────────

function showInlineError(message) {
    const $error = $w('#newProjectError');
    if (!$error) return;

    $error.text = message;

    if (typeof $error.expand === 'function') {
        $error.expand();
    }

    console.warn(`${VERSION} Inline validation error: ${message}`);
}

function clearInlineError() {
    const $error = $w('#newProjectError');
    if (!$error) return;

    if (typeof $error.collapse === 'function') {
        $error.collapse();
    }
}

// ─── STATE TRANSITION ─────────────────────────────────────────────────────────

function transitionToScope() {
    console.log(`${VERSION} Advancing to Project Scope...`);

    $w('#setUpNewProject').changeState("projectScope");
    $w('#btnNext').hide();
    $w('#btnSave').show();

    console.log(`${VERSION} Transitioned to Project Scope. Navigation hidden.`);
}

// ─── STEP 1 VALIDATION (btn click) ───────────────────────────────────────────

/**
 * Validation for State #1 (Project Details).
 * Mirrors inline validation — acts as the gate before advancing to Step 2.
 */
function validateSummaryState() {
    const title = $w('#projectName').value;
    const desc  = $w('#projectDescription').value;

    if (!title || !desc) {
        showInlineError("Project name and description are required.");
        console.warn(`${VERSION} Validation Failed: Required fields empty.`);
        return false;
    }

    if (title.length > MAX_TITLE_LENGTH) {
        showInlineError(MSG_TITLE_TOO_LONG);
        console.warn(`${VERSION} Validation Failed: Title exceeds ${MAX_TITLE_LENGTH} characters.`);
        return false;
    }

    if (desc.length > MAX_DESC_LENGTH) {
        showInlineError(MSG_DESC_TOO_LONG);
        console.warn(`${VERSION} Validation Failed: Description exceeds ${MAX_DESC_LENGTH} characters.`);
        return false;
    }

    if (!ALPHANUMERIC_REGEX.test(title)) {
        showInlineError(MSG_INVALID_TITLE);
        console.warn(`${VERSION} Validation Failed: Title contains special characters.`);
        return false;
    }

    if (!ALPHANUMERIC_REGEX.test(desc)) {
        showInlineError(MSG_INVALID_DESCRIPTION);
        console.warn(`${VERSION} Validation Failed: Description contains special characters.`);
        return false;
    }

    clearInlineError();
    return true;
}

// ─── STEP 2 VALIDATION ────────────────────────────────────────────────────────

/**
 * Validation for State #2 (Project Scope).
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

// ─── SAVE ─────────────────────────────────────────────────────────────────────

/**
 * Orchestrates the data saving process.
 */
async function handleSave() {
    if (_isSaving) return;

    if (!validateScopeState()) return;

    _isSaving = true;
    updateLoadingState(true);

    const projectData = {
        title:           $w('#projectName').value,
        description:     $w('#projectDescription').value,
        goal:            $w('#projectGoal').value,
        offer:           $w('#projectOffer').value,
        target_audience: $w('#projectAudience').value,
        misconception:   $w('#projectMisconception').value
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

// ─── LOADING STATE ────────────────────────────────────────────────────────────

/**
 * Updates UI to reflect background processing.
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