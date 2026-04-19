/**
 * Modal: Project Settings
 * Path: /page_code/modals/settings-project.modal.js
 * Version: [ PROJECT SETTINGS : v.1.4.0 ]
 *
 * CR-01 Remediation
 * -----------------
 * REMOVED: local showInlineError() / clearInlineError() — replaced by imports from notification.js
 * REMOVED: local updateLoadingState() — replaced by setButtonLoading() from ui.js
 *
 * Behaviour is otherwise identical to v.1.3.1:
 *   CREATE mode — two-step wizard (Details → Next → Scope → Save)
 *   EDIT mode   — opens at step 1 with all fields pre-filled; user advances normally
 */

import wixWindow from 'wix-window';
import { createProject, updateProject }      from 'backend/services/project.web';
import { showInlineError, clearInlineError } from 'public/utils/notification.js';
import { setButtonLoading }                  from 'public/utils/ui.js';

const VERSION = '[ PROJECT SETTINGS : v.1.4.0 ]';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ALPHANUMERIC_REGEX = /^[a-z0-9 ]*$/i;

const MAX_TITLE_LENGTH = 70;
const MAX_DESC_LENGTH  = 250;

const MSG_INVALID_TITLE       = 'Project name cannot contain special characters.';
const MSG_INVALID_DESCRIPTION = 'Project description cannot contain special characters.';
const MSG_INVALID_BOTH        = 'Project name and description cannot contain special characters.';
const MSG_TITLE_TOO_LONG      = `Project name cannot exceed ${MAX_TITLE_LENGTH} characters.`;
const MSG_DESC_TOO_LONG       = `Project description cannot exceed ${MAX_DESC_LENGTH} characters.`;
const MSG_SAVE_FAILED         = 'Unable to save your project. Please try again.';
const MSG_SAVING              = 'Saving...';
const MSG_SAVE_CREATE         = 'Save';
const MSG_SAVE_EDIT           = 'Save Changes';

// Selector for the Step 1 inline error element on the canvas
const INLINE_ERROR_SELECTOR = '#newProjectError';
const BTN_SAVE              = '#btnSave';

// ─── MODULE STATE ─────────────────────────────────────────────────────────────

let _isSaving   = false;
let _isEditMode = false;
let _projectId  = null;

// ─── BOOT ─────────────────────────────────────────────────────────────────────

$w.onReady(function () {
    console.log(`${VERSION} Modal Initializing...`);

    const context = wixWindow.lightbox.getContext();
    _isEditMode   = !!(context?.project?._id);
    _projectId    = _isEditMode ? context.project._id : null;

    console.log(`${VERSION} Mode: ${_isEditMode ? 'EDIT' : 'CREATE'}${_isEditMode ? ` | ID: ${_projectId}` : ''}`);

    initModal(context?.project || null);
    wireEventHandlers();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

function initModal(project = null) {
    $w('#projectName').maxLength        = MAX_TITLE_LENGTH;
    $w('#projectDescription').maxLength = MAX_DESC_LENGTH;

    // Always start with the error hidden
    clearInlineError(INLINE_ERROR_SELECTOR);

    if (_isEditMode && project) {
        $w('#projectHeading').text = 'Update Project';
        hydrateForm(project);
        $w('#setUpNewProject').changeState('projectDetails');
        $w('#btnNext').show();
        $w(BTN_SAVE).hide();
        $w(BTN_SAVE).label = MSG_SAVE_EDIT;
        console.log(`${VERSION} Edit mode: form hydrated for "${project.title}".`);
    } else {
        $w('#setUpNewProject').changeState('projectDetails');
        $w('#btnNext').show();
        $w(BTN_SAVE).hide();
        $w(BTN_SAVE).label = MSG_SAVE_CREATE;
        console.log(`${VERSION} Create mode: step 1 (Project Details).`);
    }
}

// ─── HYDRATION ────────────────────────────────────────────────────────────────

function hydrateForm(project) {
    $w('#projectName').value          = project.title           || '';
    $w('#projectDescription').value   = project.description     || '';
    $w('#projectGoal').value          = project.goal            || '';
    $w('#projectOffer').value         = project.offer           || '';
    $w('#projectAudience').value      = project.target_audience || '';
    $w('#projectMisconception').value = project.misconception   || '';
    console.log(`${VERSION} Form hydration complete.`);
}

// ─── EVENT WIRING ─────────────────────────────────────────────────────────────

function wireEventHandlers() {
    // Real-time inline validation on Step 1 fields
    $w('#projectName').onInput(()        => validateFieldsInline());
    $w('#projectDescription').onInput(() => validateFieldsInline());

    $w('#btnNext').onClick(() => {
        if (validateSummaryState()) transitionToScope();
    });

    $w(BTN_SAVE).onClick(() => handleSave());
    $w('#btnClose').onClick(() => wixWindow.lightbox.close());
}

// ─── REAL-TIME INLINE VALIDATION ─────────────────────────────────────────────

/**
 * Fires on every keystroke in Step 1.
 * Checks length limits first, then special-character constraints.
 * Clears the error the moment both fields are valid.
 */
function validateFieldsInline() {
    const title = $w('#projectName').value;
    const desc  = $w('#projectDescription').value;

    if (title.length > MAX_TITLE_LENGTH) { showInlineError(INLINE_ERROR_SELECTOR, MSG_TITLE_TOO_LONG); return; }
    if (desc.length  > MAX_DESC_LENGTH)  { showInlineError(INLINE_ERROR_SELECTOR, MSG_DESC_TOO_LONG);  return; }

    const titleInvalid = !ALPHANUMERIC_REGEX.test(title);
    const descInvalid  = !ALPHANUMERIC_REGEX.test(desc);

    if      (titleInvalid && descInvalid) showInlineError(INLINE_ERROR_SELECTOR, MSG_INVALID_BOTH);
    else if (titleInvalid)                showInlineError(INLINE_ERROR_SELECTOR, MSG_INVALID_TITLE);
    else if (descInvalid)                 showInlineError(INLINE_ERROR_SELECTOR, MSG_INVALID_DESCRIPTION);
    else                                  clearInlineError(INLINE_ERROR_SELECTOR);
}

// ─── STATE TRANSITION ─────────────────────────────────────────────────────────

function transitionToScope() {
    console.log(`${VERSION} Advancing to Project Scope...`);
    $w('#setUpNewProject').changeState('projectScope');
    $w('#btnNext').hide();
    $w(BTN_SAVE).show();
}

// ─── STEP 1 VALIDATION ────────────────────────────────────────────────────────

function validateSummaryState() {
    const title = $w('#projectName').value;
    const desc  = $w('#projectDescription').value;

    if (!title || !desc)                  { showInlineError(INLINE_ERROR_SELECTOR, 'Project name and description are required.'); return false; }
    if (title.length > MAX_TITLE_LENGTH)  { showInlineError(INLINE_ERROR_SELECTOR, MSG_TITLE_TOO_LONG); return false; }
    if (desc.length  > MAX_DESC_LENGTH)   { showInlineError(INLINE_ERROR_SELECTOR, MSG_DESC_TOO_LONG);  return false; }
    if (!ALPHANUMERIC_REGEX.test(title))  { showInlineError(INLINE_ERROR_SELECTOR, MSG_INVALID_TITLE);  return false; }
    if (!ALPHANUMERIC_REGEX.test(desc))   { showInlineError(INLINE_ERROR_SELECTOR, MSG_INVALID_DESCRIPTION); return false; }

    clearInlineError(INLINE_ERROR_SELECTOR);
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

    const isValid = fields.every(v => v && v.trim() !== '');

    if (!isValid) {
        console.warn(`${VERSION} Scope validation failed: all fields are required.`);
    }

    return isValid;
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

async function handleSave() {
    if (_isSaving) return;

    // In edit mode the user sees both steps — validate step 1 as a safety net
    if (_isEditMode && !validateSummaryState()) return;
    if (!validateScopeState()) return;

    _isSaving = true;
    setButtonLoading(BTN_SAVE, MSG_SAVING, _isEditMode ? MSG_SAVE_EDIT : MSG_SAVE_CREATE);

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
        console.error(`${VERSION} Save failed:`, err);
        // Show inside the modal first; also close with error payload so the
        // calling page can surface it via showToaster if needed.
        showInlineError(INLINE_ERROR_SELECTOR, err.message || MSG_SAVE_FAILED);
        wixWindow.lightbox.close({ updated: false, errorMessage: err.message || MSG_SAVE_FAILED });

    } finally {
        _isSaving = false;
        setButtonLoading(BTN_SAVE, null, _isEditMode ? MSG_SAVE_EDIT : MSG_SAVE_CREATE);
    }
}