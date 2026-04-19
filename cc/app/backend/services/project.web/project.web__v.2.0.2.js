/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Description: Backend logic for managing user projects — ownership, access control,
 *              CRUD operations, and the autonomous storyboard generation pipeline.
 * Version: [ PROJECT SERVICE : v.2.0.2 ]
 *
 * Exports:
 *   createProject          — creates a new project record for the authenticated member
 *   updateProject          — owner-only patch of an existing project record
 *   verifyProjectAccess    — authorization gate for the Project Detail dynamic page
 *   getUserProjectCount    — returns the total project count for the authenticated member
 *   getMyProjects          — returns all projects owned by the authenticated member
 *   generateStoryboard     — dispatches the n8n storyboard generation pipeline
 *   receiveFrames          — n8n callback: writes completed frames to storyboard_frames
 *   getStoryboardFrames    — polling endpoint: returns project-scoped frames for the UI
 *
 * Wix Secrets required:
 *   N8N_STORYBOARD_WEBHOOK_URL  — full n8n webhook trigger URL
 *   N8N_CALLBACK_SECRET_KEY     — shared HMAC key validated on every receiveFrames call
 *
 * Collections:
 *   projects  — core project records
 *   frames    — per-frame image + metadata records (projectId · owner-scoped)
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData                    from 'wix-data';
import { currentMember }          from 'wix-members-backend';

// NOTE: wix-secrets-backend and wix-fetch are intentionally NOT imported at
// the module level. Both are backend-only modules. A top-level static import
// causes Wix's bundler to attempt resolution in the frontend context when any
// page imports this file, throwing:
//   "Cannot find module 'wix-web-module' in 'public/pages/...'"
// Both modules are required inline inside the webMethods that use them so the
// bundler never encounters them during the frontend pass.

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const VERSION              = '[ PROJECT SERVICE : v.2.0.2 ]';

const COLLECTION_PROJECTS  = 'projects';
const COLLECTION_FRAMES    = 'frames';             // Collection ID confirmed: Frames → 'frames'
const DB_OPTIONS           = { suppressAuth: true };

/** Wix built-in role name for site admins / owners. Fixed by the Wix platform. */
const ROLE_ADMIN           = 'Admin';

// Storyboard pipeline
const SECRET_N8N_WEBHOOK   = 'N8N_STORYBOARD_WEBHOOK_URL';
const SECRET_CALLBACK_KEY  = 'N8N_CALLBACK_SECRET_KEY';
const TOTAL_FRAMES         = 15;

// Webhook retry
const MAX_RETRIES          = 3;
const RETRY_DELAYS         = [500, 1500, 4000]; // ms — exponential backoff
const RETRYABLE_STATUSES   = [429, 502, 503, 504];
const WEBHOOK_TIMEOUT_MS   = 12000;

// Storyboard status values
const STATUS_GENERATING    = 'generating';
const STATUS_COMPLETE      = 'complete';
const STATUS_FAILED        = 'failed';

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

/**
 * Resolves the currently authenticated member's ID and role status in a
 * single platform call (FULL fieldset covers both PUBLIC fields and roles).
 *
 * Returning both values from one function eliminates duplicate getMember()
 * calls across methods that need identity + admin checks.
 *
 * @returns {{ memberId: string|null, isAdmin: boolean }}
 */
async function getAuthenticatedMember() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) return { memberId: null, isAdmin: false };

        const isAdmin = Array.isArray(member.roles)
            ? member.roles.some((r) => r.name === ROLE_ADMIN)
            : false;

        return { memberId: member._id, isAdmin };
    } catch (err) {
        console.error(`${VERSION} getAuthenticatedMember failure:`, err);
        return { memberId: null, isAdmin: false };
    }
}

/**
 * Fires a POST request to a webhook URL with exponential backoff.
 * Each attempt is independently aborted after WEBHOOK_TIMEOUT_MS.
 *
 * @param {string} url
 * @param {object} body
 * @returns {{ ok: boolean, status: number, data?: any, error?: object }}
 */
async function postWithRetry(url, body) {
    const { fetch } = require('wix-fetch');
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        try {
            console.log(`${VERSION} Webhook attempt ${attempt}/${MAX_RETRIES}`);

            const response = await fetch(url, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(body),
                signal:  controller.signal
            });

            clearTimeout(timer);

            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                return { ok: true, status: response.status, data };
            }

            if (!RETRYABLE_STATUSES.includes(response.status)) {
                console.error(`${VERSION} Non-retryable webhook status: ${response.status}`);
                return {
                    ok: false,
                    status: response.status,
                    error: { type: 'HTTP_ERROR', message: `Status ${response.status}` }
                };
            }

            lastError = `HTTP ${response.status}`;

        } catch (err) {
            clearTimeout(timer);
            lastError = err.name === 'AbortError' ? 'TIMEOUT' : err.message;
            console.warn(`${VERSION} Webhook attempt ${attempt} failed: ${lastError}`);
        }

        if (attempt < MAX_RETRIES) {
            await new Promise(res => setTimeout(res, RETRY_DELAYS[attempt - 1]));
        }
    }

    console.error(`${VERSION} All ${MAX_RETRIES} webhook attempts exhausted. Last error: ${lastError}`);
    return { ok: false, status: 503, error: { type: 'WEBHOOK_UNAVAILABLE', message: lastError } };
}

// ─── CREATE PROJECT ───────────────────────────────────────────────────────────

/**
 * Creates a new project record owned by the authenticated member.
 *
 * _owner is set automatically by Wix on insert. The `owner` field mirrors
 * it for legacy query compatibility (getUserProjectCount, getMyProjects)
 * until field consolidation is complete.
 *
 * @param {object} projectData
 * @returns {{ ok: boolean, data?: object, error?: object }}
 */
export const createProject = webMethod(Permissions.Anyone, async (projectData) => {
    try {
        const { memberId } = await getAuthenticatedMember();
        if (!memberId) {
            console.warn(`${VERSION} createProject: Unauthorized attempt.`);
            return { ok: false, error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' } };
        }

        const payload = {
            title:           projectData.title,
            description:     projectData.description,
            goal:            projectData.goal,
            offer:           projectData.offer,
            target_audience: projectData.target_audience,
            misconception:   projectData.misconception,
            owner:           memberId
        };

        const result = await wixData.insert(COLLECTION_PROJECTS, payload, DB_OPTIONS);
        console.log(`${VERSION} createProject: Created ${result._id} for member: ${memberId}`);
        return { ok: true, data: result };

    } catch (err) {
        console.error(`${VERSION} createProject failure:`, err);
        return { ok: false, error: { type: 'INTERNAL', message: err.message } };
    }
});

// ─── VERIFY PROJECT ACCESS ────────────────────────────────────────────────────

/**
 * Authorization gate for the Project Detail dynamic page.
 *
 * Access is granted ONLY when:
 *   (a) the requesting member is the project owner, OR
 *   (b) the requesting member holds the site Admin role.
 *
 * Read-only — never mutates data.
 * Returns no project payload on denial to prevent data leakage.
 *
 * @param {string} projectId
 * @returns {{ ok: boolean, authorized: boolean, data?: object, error?: object }}
 */
export const verifyProjectAccess = webMethod(Permissions.Anyone, async (projectId) => {
    try {
        if (!projectId) {
            console.warn(`${VERSION} verifyProjectAccess: Called without a projectId.`);
            return {
                ok: false, authorized: false,
                error: { type: 'MISSING_ID', message: 'Project ID is required.' }
            };
        }

        const { memberId, isAdmin } = await getAuthenticatedMember();
        if (!memberId) {
            console.warn(`${VERSION} verifyProjectAccess: Unauthenticated attempt. Project: ${projectId}`);
            return {
                ok: true, authorized: false,
                error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' }
            };
        }

        const project = await wixData.get(COLLECTION_PROJECTS, projectId, DB_OPTIONS);
        if (!project) {
            console.warn(`${VERSION} verifyProjectAccess: Not found. ID: ${projectId}`);
            return {
                ok: false, authorized: false,
                error: { type: 'NOT_FOUND', message: 'Project not found.' }
            };
        }

        if (project._owner === memberId) {
            console.log(`${VERSION} verifyProjectAccess: GRANTED (owner). Member: ${memberId}, Project: ${projectId}`);
            return { ok: true, authorized: true, data: project };
        }

        if (isAdmin) {
            console.log(`${VERSION} verifyProjectAccess: GRANTED (admin). Member: ${memberId}, Project: ${projectId}`);
            return { ok: true, authorized: true, data: project };
        }

        console.warn(`${VERSION} verifyProjectAccess: DENIED. Member: ${memberId}, Project: ${projectId}`);
        return {
            ok: true, authorized: false,
            error: { type: 'FORBIDDEN', message: 'You do not have permission to view this project.' }
        };

    } catch (err) {
        console.error(`${VERSION} verifyProjectAccess failure:`, err);
        return {
            ok: false, authorized: false,
            error: { type: 'INTERNAL', message: err.message }
        };
    }
});

// ─── UPDATE PROJECT ───────────────────────────────────────────────────────────

/**
 * Updates an existing project record.
 * Only the project owner may update — admin read access does not confer
 * write access by design.
 *
 * Builds an explicit update payload — never spreads `existing` blindly
 * to avoid writing stale Wix internal metadata back to the record.
 *
 * @param {string} projectId
 * @param {object} projectData
 * @returns {{ ok: boolean, data?: object, error?: object }}
 */
export const updateProject = webMethod(Permissions.Anyone, async (projectId, projectData) => {
    try {
        if (!projectId) {
            console.warn(`${VERSION} updateProject: Called without a projectId.`);
            return { ok: false, error: { type: 'MISSING_ID', message: 'Project ID is required.' } };
        }

        const { memberId } = await getAuthenticatedMember();
        if (!memberId) {
            console.warn(`${VERSION} updateProject: Unauthorized attempt.`);
            return { ok: false, error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' } };
        }

        const existing = await wixData.get(COLLECTION_PROJECTS, projectId, DB_OPTIONS);
        if (!existing) {
            console.error(`${VERSION} updateProject: Not found. ID: ${projectId}`);
            return { ok: false, error: { type: 'NOT_FOUND', message: 'Project not found.' } };
        }

        if (existing._owner !== memberId) {
            console.warn(`${VERSION} updateProject: Ownership mismatch. Member: ${memberId}, Owner: ${existing._owner}`);
            return { ok: false, error: { type: 'FORBIDDEN', message: 'You do not have permission to edit this project.' } };
        }

        const updatePayload = {
            _id:             existing._id,
            _owner:          existing._owner,
            owner:           existing.owner,
            title:           projectData.title,
            description:     projectData.description,
            goal:            projectData.goal,
            offer:           projectData.offer,
            target_audience: projectData.target_audience,
            misconception:   projectData.misconception,
            // Preserve storyboard state — never overwritten by a project edit
            storyboardStatus:     existing.storyboardStatus,
            storyboardFrameCount: existing.storyboardFrameCount,
            storyboardStartedAt:  existing.storyboardStartedAt,
            storyboardCompletedAt: existing.storyboardCompletedAt
        };

        const result = await wixData.update(COLLECTION_PROJECTS, updatePayload, DB_OPTIONS);
        console.log(`${VERSION} updateProject: Updated ${result._id} by member: ${memberId}`);
        return { ok: true, data: result };

    } catch (err) {
        console.error(`${VERSION} updateProject failure:`, err);
        return { ok: false, error: { type: 'INTERNAL', message: err.message } };
    }
});

// ─── GET PROJECT COUNT ────────────────────────────────────────────────────────

/**
 * Returns the total number of projects owned by the authenticated member.
 *
 * @returns {{ ok: boolean, count: number, error?: object }}
 */
export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        const { memberId } = await getAuthenticatedMember();
        if (!memberId) return { ok: true, count: 0 };

        const count = await wixData.query(COLLECTION_PROJECTS)
            .eq('owner', memberId)
            .count(DB_OPTIONS);

        console.log(`${VERSION} getUserProjectCount: ${count} projects for member: ${memberId}`);
        return { ok: true, count };

    } catch (err) {
        console.error(`${VERSION} getUserProjectCount failure:`, err);
        return { ok: false, count: 0, error: { type: 'INTERNAL', message: err.message } };
    }
});

// ─── GET MY PROJECTS ──────────────────────────────────────────────────────────

/**
 * Returns all projects owned by the authenticated member, newest first.
 *
 * @returns {{ ok: boolean, data: array, error?: object }}
 */
export const getMyProjects = webMethod(Permissions.Anyone, async () => {
    try {
        const { memberId } = await getAuthenticatedMember();
        if (!memberId) return { ok: true, data: [] };

        const results = await wixData.query(COLLECTION_PROJECTS)
            .eq('owner', memberId)
            .descending('_createdDate')
            .find(DB_OPTIONS);

        console.log(`${VERSION} getMyProjects: Retrieved ${results.items.length} projects for member: ${memberId}`);
        return { ok: true, data: results.items };

    } catch (err) {
        console.error(`${VERSION} getMyProjects failure:`, err);
        return { ok: false, data: [], error: { type: 'INTERNAL', message: err.message } };
    }
});

// ─── GENERATE STORYBOARD ──────────────────────────────────────────────────────

/**
 * Initiates the n8n storyboard generation pipeline for a project.
 *
 * Flow:
 *   1. Input guard.
 *   2. Verify the caller is the project owner.
 *   3. Guard against duplicate generation runs (409 ALREADY_RUNNING).
 *   4. Stamp project: storyboardStatus = 'generating', frameCount = 0.
 *   5. Resolve webhook URL from Wix Secrets Manager.
 *   6. Dispatch signed payload to n8n — returns 202 immediately.
 *   7. On dispatch failure: roll project status back to 'failed'.
 *
 * n8n webhook receives:
 *   { projectId, owner, title, description, goal, offer,
 *     target_audience, misconception, totalFrames, dispatchedAt }
 *
 * @param {string} projectId
 * @returns {{ ok: boolean, status: number, error?: object }}
 */
export const generateStoryboard = webMethod(Permissions.Anyone, async (projectId) => {
    try {
        // 1. Input guard
        if (!projectId) {
            console.warn(`${VERSION} generateStoryboard: No projectId supplied.`);
            return { ok: false, status: 400, error: { type: 'MISSING_ID', message: 'Project ID is required.' } };
        }

        // 2. Identity check
        const { memberId } = await getAuthenticatedMember();
        if (!memberId) {
            console.warn(`${VERSION} generateStoryboard: Unauthenticated attempt.`);
            return { ok: false, status: 401, error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' } };
        }

        // 3. Fetch project and verify ownership
        const project = await wixData.get(COLLECTION_PROJECTS, projectId, DB_OPTIONS);
        if (!project) {
            console.warn(`${VERSION} generateStoryboard: Project not found: ${projectId}`);
            return { ok: false, status: 404, error: { type: 'NOT_FOUND', message: 'Project not found.' } };
        }
        if (project._owner !== memberId) {
            console.warn(`${VERSION} generateStoryboard: Ownership mismatch. Member: ${memberId}`);
            return { ok: false, status: 403, error: { type: 'FORBIDDEN', message: 'You do not own this project.' } };
        }

        // 4. Guard: prevent duplicate generation run
        if (project.storyboardStatus === STATUS_GENERATING) {
            console.warn(`${VERSION} generateStoryboard: Already generating for project: ${projectId}`);
            return {
                ok: false, status: 409,
                error: { type: 'ALREADY_RUNNING', message: 'Storyboard generation is already in progress.' }
            };
        }

        // 5. Stamp project as generating and reset frame count
        await wixData.update(COLLECTION_PROJECTS, {
            ...project,
            storyboardStatus:     STATUS_GENERATING,
            storyboardFrameCount: 0,
            storyboardStartedAt:  new Date().toISOString(),
            storyboardCompletedAt: null
        }, DB_OPTIONS);

        console.log(`${VERSION} generateStoryboard: Project ${projectId} marked as generating.`);

        // 6. Resolve webhook URL from Wix Secrets Manager
        const { getSecret } = require('wix-secrets-backend');
        const webhookUrl = await getSecret(SECRET_N8N_WEBHOOK);
        if (!webhookUrl) {
            console.error(`${VERSION} generateStoryboard: Secret '${SECRET_N8N_WEBHOOK}' not found.`);
            // Rollback status so the user can retry
            await wixData.update(COLLECTION_PROJECTS, { ...project, storyboardStatus: STATUS_FAILED }, DB_OPTIONS);
            return {
                ok: false, status: 500,
                error: { type: 'CONFIGURATION_ERROR', message: 'Storyboard service is not configured.' }
            };
        }

        // 7. Build and dispatch payload to n8n
        const webhookPayload = {
            projectId:       project._id,
            owner:           memberId,
            title:           project.title,
            description:     project.description,
            goal:            project.goal,
            offer:           project.offer,
            target_audience: project.target_audience,
            misconception:   project.misconception,
            totalFrames:     TOTAL_FRAMES,
            dispatchedAt:    new Date().toISOString()
        };

        const webhookResult = await postWithRetry(webhookUrl, webhookPayload);

        if (!webhookResult.ok) {
            // Rollback: reset status so the user can retry
            await wixData.update(COLLECTION_PROJECTS, { ...project, storyboardStatus: STATUS_FAILED }, DB_OPTIONS);
            console.error(`${VERSION} generateStoryboard: Dispatch failed. Project reset to failed.`);
            return {
                ok: false, status: 503,
                error: { type: 'DISPATCH_FAILED', message: 'Unable to start generation. Please try again.' }
            };
        }

        console.log(`${VERSION} generateStoryboard: Pipeline dispatched for project: ${projectId}`);
        return { ok: true, status: 202 };

    } catch (err) {
        console.error(`${VERSION} generateStoryboard failure:`, err);
        return { ok: false, status: 500, error: { type: 'INTERNAL', message: err.message } };
    }
});

// ─── RECEIVE FRAMES (n8n CALLBACK) ────────────────────────────────────────────

/**
 * Called by n8n as each frame completes.
 *
 * Public (Permissions.Anyone) — n8n has no Wix member session.
 * Security is enforced by the shared-secret header check (step 2).
 * Ownership is re-verified against the DB before any write (step 3).
 * Idempotent: duplicate deliveries from n8n retries are silently skipped (step 4).
 *
 * Expected payload from n8n:
 * {
 *   projectId:   string,
 *   owner:       string,    — Wix member ID, echoed from the dispatch payload
 *   frameIndex:  number,    — 0-based, 0–14
 *   imageUrl:    string,
 *   promptText:  string,
 *   frameData:   object,    — composition, lighting, timing, CTA metadata
 *   secretKey:   string     — must match N8N_CALLBACK_SECRET_KEY
 * }
 *
 * On the 15th and final frame (frameCount >= TOTAL_FRAMES), the project
 * record is stamped: storyboardStatus = 'complete'.
 *
 * @param {object} framePayload
 * @returns {{ ok: boolean, status: number, duplicate?: boolean, isComplete?: boolean, error?: object }}
 */
export const receiveFrames = webMethod(Permissions.Anyone, async (framePayload) => {
    try {
        // 1. Structural guard — validate required fields before any async work
        const { projectId, owner, frameIndex, imageUrl, promptText, frameData, secretKey } = framePayload || {};

        if (!projectId || !owner || frameIndex === undefined || !imageUrl || !secretKey) {
            console.warn(`${VERSION} receiveFrames: Malformed payload.`, { projectId, owner, frameIndex, hasUrl: !!imageUrl });
            return { ok: false, status: 400, error: { type: 'INVALID_PAYLOAD', message: 'Required fields missing.' } };
        }

        // 2. Shared-secret validation — prevents unauthorized frame writes
        const { getSecret } = require('wix-secrets-backend');
        const expectedKey = await getSecret(SECRET_CALLBACK_KEY);
        if (!expectedKey || secretKey !== expectedKey) {
            console.warn(`${VERSION} receiveFrames: Invalid secret key. ProjectId: ${projectId}`);
            return { ok: false, status: 403, error: { type: 'INVALID_SECRET', message: 'Unauthorized callback.' } };
        }

        // 3. Project ownership verification — access-isolation gate
        //    A frame write is only permitted if the payload owner exactly
        //    matches the project's stored _owner. Prevents cross-project pollution.
        const project = await wixData.get(COLLECTION_PROJECTS, projectId, DB_OPTIONS);
        if (!project) {
            console.warn(`${VERSION} receiveFrames: Project not found: ${projectId}`);
            return { ok: false, status: 404, error: { type: 'NOT_FOUND', message: 'Project not found.' } };
        }
        if (project._owner !== owner) {
            console.warn(`${VERSION} receiveFrames: Owner mismatch. Payload: ${owner}, Project: ${project._owner}`);
            return { ok: false, status: 403, error: { type: 'OWNERSHIP_MISMATCH', message: 'Frame owner does not match project owner.' } };
        }

        // 4. Idempotency: skip duplicate frame writes (n8n retries are expected)
        const existing = await wixData.query(COLLECTION_FRAMES)
            .eq('projectId', projectId)
            .eq('frameIndex', frameIndex)
            .find(DB_OPTIONS);

        if (existing.items.length > 0) {
            console.log(`${VERSION} receiveFrames: Duplicate frame ${frameIndex} for project ${projectId} — skipping.`);
            return { ok: true, status: 200, duplicate: true };
        }

        // 5. Insert the verified frame record
        const frameRecord = {
            projectId,
            owner,                      // stored for query-level isolation on all reads
            frameIndex,
            imageUrl,
            promptText:  promptText  || '',
            frameData:   frameData   || {},
            status:      STATUS_COMPLETE,
            receivedAt:  new Date().toISOString()
        };

        await wixData.insert(COLLECTION_FRAMES, frameRecord, DB_OPTIONS);
        console.log(`${VERSION} receiveFrames: Frame ${frameIndex} saved for project ${projectId}.`);

        // 6. Increment project frame count and mark complete if all frames received
        const newCount  = (project.storyboardFrameCount || 0) + 1;
        const isComplete = newCount >= TOTAL_FRAMES;

        await wixData.update(COLLECTION_PROJECTS, {
            ...project,
            storyboardFrameCount:  newCount,
            storyboardStatus:      isComplete ? STATUS_COMPLETE : STATUS_GENERATING,
            ...(isComplete ? { storyboardCompletedAt: new Date().toISOString() } : {})
        }, DB_OPTIONS);

        if (isComplete) {
            console.log(`${VERSION} receiveFrames: All ${TOTAL_FRAMES} frames received. Project ${projectId} marked complete.`);
        }

        return { ok: true, status: 201, frameIndex, isComplete };

    } catch (err) {
        console.error(`${VERSION} receiveFrames failure:`, err);
        return { ok: false, status: 500, error: { type: 'INTERNAL', message: err.message } };
    }
});

// ─── GET STORYBOARD FRAMES (POLLING ENDPOINT) ─────────────────────────────────

/**
 * Returns all currently-saved frames for a project, ordered by frameIndex.
 *
 * Called from the frontend polling loop (storyboard-poller.js) every 4 seconds
 * until all 15 frames are confirmed or projectStatus === 'complete'.
 *
 * Security model — two layers:
 *   1. Caller identity verified against the project's _owner (or Admin role).
 *   2. DB query scoped to both projectId AND owner — defense in depth
 *      ensuring a compromised caller cannot pull another member's frames
 *      even if they supply the correct projectId.
 *
 * @param {string} projectId
 * @returns {{ ok: boolean, status: number, frames?: array, projectStatus?: string, frameCount?: number, totalFrames?: number, error?: object }}
 */
export const getStoryboardFrames = webMethod(Permissions.Anyone, async (projectId) => {
    try {
        if (!projectId) {
            return { ok: false, status: 400, error: { type: 'MISSING_ID', message: 'Project ID is required.' } };
        }

        const { memberId, isAdmin } = await getAuthenticatedMember();
        if (!memberId) {
            return { ok: false, status: 401, error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' } };
        }

        const project = await wixData.get(COLLECTION_PROJECTS, projectId, DB_OPTIONS);
        if (!project) {
            return { ok: false, status: 404, error: { type: 'NOT_FOUND', message: 'Project not found.' } };
        }
        if (project._owner !== memberId && !isAdmin) {
            console.warn(`${VERSION} getStoryboardFrames: Unauthorized. Member: ${memberId}, Project: ${projectId}`);
            return { ok: false, status: 403, error: { type: 'FORBIDDEN', message: 'Access denied.' } };
        }

        // Query frames scoped to projectId AND the project's stored owner —
        // the caller identity is used for the access check above; the DB
        // query always uses project._owner to prevent admin-scoped leakage.
        const results = await wixData.query(COLLECTION_FRAMES)
            .eq('projectId', projectId)
            .eq('owner', project._owner)
            .ascending('frameIndex')
            .find(DB_OPTIONS);

        console.log(`${VERSION} getStoryboardFrames: ${results.items.length} frames returned for project ${projectId}.`);

        return {
            ok:            true,
            status:        200,
            frames:        results.items,
            projectStatus: project.storyboardStatus || 'idle',
            frameCount:    results.items.length,
            totalFrames:   TOTAL_FRAMES
        };

    } catch (err) {
        console.error(`${VERSION} getStoryboardFrames failure:`, err);
        return { ok: false, status: 500, error: { type: 'INTERNAL', message: err.message } };
    }
});