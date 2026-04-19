/**
 * Modal: Project Settings
 * Path: /page_code/modals/project-settings.modal.js
 * Description: Multi-step wizard for project creation and edit. Detects mode via lightbox context.
 * Version: [ PROJECT SETTINGS : v.1.3.0 ]
 */

import wixWindow from 'wix-window';
import { createProject, updateProject } from 'backend/services/project.web';

const VERSION = '[ PROJECT SETTINGS : v.1.3.0 ]';

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
const MSG_SAVE_FAILED         = "Unable to save your project. Please try again.";

// ─── MODULE STATE ─────────────────────────────────────────────────────────────

let _isSaving   = false;
let _isEditMode = false;   // true when editing an existing project
let _projectId  = null;    // populated in edit mode

// ─── BOOT ─────────────────────────────────────────────────────────────────────

$w.onReady(function () {
    console.log(`${VERSION} Modal Initializing...`);

    const context = wixWindow.lightbox.getContext();
    _isEditMode   = !!(context && context.project && context.project._id);
    _projectId    = _isEditMode ? context.project._id : null;

    console.log(`${VERSION} Mode: ${_isEditMode ? 'EDIT' : 'CREATE'}${_isEditMode ? ` | Project ID: ${_projectId}` : ''}`);

    initModal(context?.project || null);
    wireEventHandlers();
});

// ─── INIT ────────────────────────────────────────────────────────────────────

/**
 * Configures the modal for either CREATE or EDIT mode.
 *
 * CREATE: Standard two-step wizard (step 1 → Next → step 2 → Save).
 * EDIT:   Both steps are already filled; skip straight to projectScope so
 *         the user sees all fields at once and can save immediately.
 */
function initModal(project = null) {
    // Enforce character limits at the component level
    $w('#projectName').maxLength        = MAX_TITLE_LENGTH;
    $w('#projectDescription').maxLength = MAX_DESC_LENGTH;

    clearInlineError();

    if (_isEditMode && project) {
        // ── EDIT MODE: hydrate all fields, surface the scope state directly ──
        hydrateForm(project);

        $w('#setUpNewProject').changeState("projectScope");
        $w('#btnNext').hide();
        $w('#btnSave').show();
        $w('#btnSave').label = "Save Changes";

        console.log(`${VERSION} Edit mode: form hydrated for "${project.title}".`);
    } else {
        // ── CREATE MODE: standard wizard starting at step 1 ──
        $w('#setUpNewProject').changeState("projectDetails");
        $w('#btnNext').show();
        $w('#btnSave').hide();
        $w('#btnSave').label = "Save";

        console.log(`${VERSION} Create mode: step 1 (Project Details).`);
    }
}

// ─── HYDRATION ────────────────────────────────────────────────────────────────

/**
 * Populates all form fields with the existing project data.
 * Called exclusively in edit mode.
 *
 * @param {object} project - The current project item from the dynamic dataset.
 */
function hydrateForm(project) {
    $w('#projectName').value        = project.title           || "";
    $w('#projectDescription').value = project.description     || "";
    $w('#projectGoal').value        = project.goal            || "";
    $w('#projectOffer').value       = project.offer           || "";
    $w('#projectAudience').value    = project.target_audience || "";
    $w('#projectMisconception').value = project.misconception || "";

    console.log(`${VERSION} Form hydration complete.`);
}

// ─── EVENT WIRING ─────────────────────────────────────────────────────────────

function wireEventHandlers() {
    // Real-time inline validation — fires on every keystroke in step 1
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

function validateFieldsInline() {
    const title = $w('#projectName').value;
    const desc  = $w('#projectDescription').value;

    if (title.length > MAX_TITLE_LENGTH) { showInlineError(MSG_TITLE_TOO_LONG); return; }
    if (desc.length > MAX_DESC_LENGTH)   { showInlineError(MSG_DESC_TOO_LONG);  return; }

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
    if (typeof $error.expand === 'function') $error.expand();
    console.warn(`${VERSION} Inline validation error: ${message}`);
}

function clearInlineError() {
    const $error = $w('#newProjectError');
    if (!$error) return;
    if (typeof $error.collapse === 'function') $error.collapse();
}

// ─── STATE TRANSITION ─────────────────────────────────────────────────────────

function transitionToScope() {
    console.log(`${VERSION} Advancing to Project Scope...`);
    $w('#setUpNewProject').changeState("projectScope");
    $w('#btnNext').hide();
    $w('#btnSave').show();
}

// ─── STEP 1 VALIDATION ────────────────────────────────────────────────────────

function validateSummaryState() {
    const title = $w('#projectName').value;
    const desc  = $w('#projectDescription').value;

    if (!title || !desc) {
        showInlineError("Project name and description are required.");
        return false;
    }
    if (title.length > MAX_TITLE_LENGTH) { showInlineError(MSG_TITLE_TOO_LONG); return false; }
    if (desc.length > MAX_DESC_LENGTH)   { showInlineError(MSG_DESC_TOO_LONG);  return false; }
    if (!ALPHANUMERIC_REGEX.test(title)) { showInlineError(MSG_INVALID_TITLE);  return false; }
    if (!ALPHANUMERIC_REGEX.test(desc))  { showInlineError(MSG_INVALID_DESCRIPTION); return false; }

    clearInlineError();
    return true;
}

// ─── STEP 2 VALIDATION ────────────────────────────────────────────────────────

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
 * Branches to createProject or updateProject based on the detected mode.
 * In edit mode, Step 1 validation is also re-run as a safety net before
 * calling the backend — the user could theoretically clear a field while
 * in the scope view.
 */
async function handleSave() {
    if (_isSaving) return;

    // In edit mode both steps are visible — validate both before saving
    if (_isEditMode && !validateSummaryState()) return;
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
        let response;

        if (_isEditMode) {
            console.log(`${VERSION} Dispatching updateProject for ID: ${_projectId}`);
            response = await updateProject(_projectId, projectData);
        } else {
            console.log(`${VERSION} Dispatching createProject.`);
            response = await createProject(projectData);
        }

        if (response.ok) {
            const action = _isEditMode ? 'updated' : 'created';
            console.log(`${VERSION} Project ${action} successfully.`);
            wixWindow.lightbox.close({ updated: true, mode: _isEditMode ? 'edit' : 'create' });
        } else {
            throw new Error(response.error?.message || MSG_SAVE_FAILED);
        }

    } catch (err) {
        console.error(`${VERSION} Error during project save:`, err);
        showInlineError(MSG_SAVE_FAILED);
        updateLoadingState(false);
    }
}

// ─── LOADING STATE ────────────────────────────────────────────────────────────

function updateLoadingState(isLoading) {
    if (isLoading) {
        $w('#btnSave').label = "Saving...";
        $w('#btnSave').disable();
    } else {
        $w('#btnSave').label = _isEditMode ? "Save Changes" : "Save";
        $w('#btnSave').enable();
        _isSaving = false;
    }
}