/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Description: Backend logic for managing user projects with strict ownership
 *              filtering and elevated DB permissions.
 * Version: [ PROJECT SERVICE : v.1.7.0 ]
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const VERSION = '[ PROJECT SERVICE : v.1.7.0 ]';
const COLLECTION_PROJECTS = 'projects';
const DB_OPTIONS           = { suppressAuth: true };

// ─── ROLE CONSTANTS ───────────────────────────────────────────────────────────

/**
 * Wix built-in role name for site admins / owners.
 * Fixed by the Wix platform — no external configuration required.
 */
const ROLE_ADMIN = 'Admin';

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

/**
 * Resolves the currently authenticated member's ID and role status in a
 * single platform call (FULL fieldset covers both PUBLIC fields and roles).
 *
 * Returning both values from one function eliminates the duplicate
 * getMember() calls that existed when getAuthenticatedMemberId() and
 * isCurrentMemberAdmin() were separate helpers.
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

// ─── CREATE PROJECT ───────────────────────────────────────────────────────────

export const createProject = webMethod(Permissions.Anyone, async (projectData) => {
    try {
        const { memberId } = await getAuthenticatedMember();
        if (!memberId) {
            console.warn(`${VERSION} createProject: Unauthorized attempt.`);
            return {
                ok: false,
                error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' }
            };
        }

        const payload = {
            title:           projectData.title,
            description:     projectData.description,
            goal:            projectData.goal,
            offer:           projectData.offer,
            target_audience: projectData.target_audience,
            misconception:   projectData.misconception,
            // _owner is set automatically by Wix on insert. The `owner` field
            // mirrors it for legacy query compatibility (getUserProjectCount,
            // getMyProjects) until field consolidation is complete.
            owner: memberId
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
 * @returns {{ ok: boolean, authorized: boolean, data?: object, error?: { type: string, message: string } }}
 */
export const verifyProjectAccess = webMethod(Permissions.Anyone, async (projectId) => {
    try {
        // 1. Input guard — validate before any async work.
        if (!projectId) {
            console.warn(`${VERSION} verifyProjectAccess: Called without a projectId.`);
            return {
                ok: false,
                authorized: false,
                error: { type: 'MISSING_ID', message: 'Project ID is required.' }
            };
        }

        // 2. Resolve identity and admin status in a single platform call.
        const { memberId, isAdmin } = await getAuthenticatedMember();
        if (!memberId) {
            console.warn(`${VERSION} verifyProjectAccess: Unauthenticated attempt. Project: ${projectId}`);
            return {
                ok: true,
                authorized: false,
                error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' }
            };
        }

        // 3. Fetch the project record.
        const project = await wixData.get(COLLECTION_PROJECTS, projectId, DB_OPTIONS);
        if (!project) {
            console.warn(`${VERSION} verifyProjectAccess: Not found. ID: ${projectId}`);
            return {
                ok: false,
                authorized: false,
                error: { type: 'NOT_FOUND', message: 'Project not found.' }
            };
        }

        // 4. Owner check — fastest grant path.
        if (project._owner === memberId) {
            console.log(`${VERSION} verifyProjectAccess: GRANTED (owner). Member: ${memberId}, Project: ${projectId}`);
            return { ok: true, authorized: true, data: project };
        }

        // 5. Admin check — already resolved in step 2, no second API call needed.
        if (isAdmin) {
            console.log(`${VERSION} verifyProjectAccess: GRANTED (admin). Member: ${memberId}, Project: ${projectId}`);
            return { ok: true, authorized: true, data: project };
        }

        // 6. Deny all others — no data returned to prevent leakage.
        console.warn(`${VERSION} verifyProjectAccess: DENIED. Member: ${memberId}, Project: ${projectId}`);
        return {
            ok: true,
            authorized: false,
            error: { type: 'FORBIDDEN', message: 'You do not have permission to view this project.' }
        };

    } catch (err) {
        console.error(`${VERSION} verifyProjectAccess failure:`, err);
        return {
            ok: false,
            authorized: false,
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
 * @param {string} projectId
 * @param {object} projectData
 */
export const updateProject = webMethod(Permissions.Anyone, async (projectId, projectData) => {
    try {
        // 1. Input guard — validate before any async work.
        if (!projectId) {
            console.warn(`${VERSION} updateProject: Called without a projectId.`);
            return { ok: false, error: { type: 'MISSING_ID', message: 'Project ID is required.' } };
        }

        // 2. Resolve identity.
        const { memberId } = await getAuthenticatedMember();
        if (!memberId) {
            console.warn(`${VERSION} updateProject: Unauthorized attempt.`);
            return { ok: false, error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' } };
        }

        // 3. Fetch existing record.
        const existing = await wixData.get(COLLECTION_PROJECTS, projectId, DB_OPTIONS);
        if (!existing) {
            console.error(`${VERSION} updateProject: Not found. ID: ${projectId}`);
            return { ok: false, error: { type: 'NOT_FOUND', message: 'Project not found.' } };
        }

        // 4. Ownership check — admins may read but only owners may write.
        if (existing._owner !== memberId) {
            console.warn(`${VERSION} updateProject: Ownership mismatch. Member: ${memberId}, Owner: ${existing._owner}`);
            return { ok: false, error: { type: 'FORBIDDEN', message: 'You do not have permission to edit this project.' } };
        }

        // 5. Build an explicit update payload — never spread `existing` to avoid
        //    writing stale Wix internal metadata back to the record.
        const updatePayload = {
            _id:             existing._id,
            _owner:          existing._owner,
            owner:           existing.owner,
            title:           projectData.title,
            description:     projectData.description,
            goal:            projectData.goal,
            offer:           projectData.offer,
            target_audience: projectData.target_audience,
            misconception:   projectData.misconception
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

export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        const { memberId } = await getAuthenticatedMember();
        if (!memberId) return { ok: true, count: 0 };

        const count = await wixData.query(COLLECTION_PROJECTS)
            .eq('_owner', memberId)
            .count(DB_OPTIONS);

        console.log(`${VERSION} getUserProjectCount: ${count} projects for member: ${memberId}`);
        return { ok: true, count };

    } catch (err) {
        console.error(`${VERSION} getUserProjectCount failure:`, err);
        return { ok: false, count: 0, error: { type: 'INTERNAL', message: err.message } };
    }
});

// ─── GET MY PROJECTS ──────────────────────────────────────────────────────────

export const getMyProjects = webMethod(Permissions.Anyone, async () => {
    try {
        const { memberId } = await getAuthenticatedMember();
        if (!memberId) return { ok: true, data: [] };

        const results = await wixData.query(COLLECTION_PROJECTS)
            .eq('_owner', memberId)
            .descending('_createdDate')
            .find(DB_OPTIONS);

        console.log(`${VERSION} getMyProjects: Retrieved ${results.items.length} projects for member: ${memberId}`);
        return { ok: true, data: results.items };

    } catch (err) {
        console.error(`${VERSION} getMyProjects failure:`, err);
        return { ok: false, data: [], error: { type: 'INTERNAL', message: err.message } };
    }
});