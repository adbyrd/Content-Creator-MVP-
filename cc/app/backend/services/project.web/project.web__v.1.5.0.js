/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Description: Backend logic for managing user projects with strict ownership filtering and elevated DB permissions.
 * Version: [ PROJECT SERVICE : v.1.5.0 ]
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const VERSION = '[ PROJECT SERVICE : v.1.5.0 ]';
const COLLECTION_PROJECTS = "projects";
const DB_OPTIONS = { suppressAuth: true };

async function getAuthenticatedMemberId() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
        return member ? member._id : null;
    } catch (err) {
        console.error(`${VERSION} Identity check internal failure:`, err);
        return null;
    }
}

export const createProject = webMethod(Permissions.Anyone, async (projectData) => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) {
            console.warn(`${VERSION} Unauthorized project creation attempt.`);
            throw new Error("Unauthorized");
        }

        const payload = {
            title: projectData.title,
            description: projectData.description,
            goal: projectData.goal,
            offer: projectData.offer,
            target_audience: projectData.target_audience,
            misconception: projectData.misconception,
            owner: memberId
        };

        const result = await wixData.insert(COLLECTION_PROJECTS, payload, DB_OPTIONS);
        console.log(`${VERSION} Project created: ${result._id} for member: ${memberId}`);
        return { ok: true, data: result };
    } catch (err) {
        console.error(`${VERSION} createProject failure:`, err);
        return { ok: false, error: err.message };
    }
});

// ─── UPDATE PROJECT ───────────────────────────────────────────────────────────

/**
 * Updates an existing project record.
 * Ownership is strictly verified — a member can only update their own projects.
 *
 * @param {string} projectId - The _id of the project to update.
 * @param {object} projectData - The updated field values.
 */
export const updateProject = webMethod(Permissions.Anyone, async (projectId, projectData) => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) {
            console.warn(`${VERSION} Unauthorized updateProject attempt.`);
            return { ok: false, error: { type: 'AUTH_REQUIRED', message: 'Authentication required.' } };
        }

        if (!projectId) {
            console.warn(`${VERSION} updateProject called without a projectId.`);
            return { ok: false, error: { type: 'MISSING_ID', message: 'Project ID is required.' } };
        }

        // 1. Fetch the existing record to verify ownership
        const existing = await wixData.get(COLLECTION_PROJECTS, projectId, DB_OPTIONS);

        if (!existing) {
            console.error(`${VERSION} updateProject: Project not found. ID: ${projectId}`);
            return { ok: false, error: { type: 'NOT_FOUND', message: 'Project not found.' } };
        }

        // 2. Enforce ownership — member may only patch their own record
        if (existing._owner !== memberId) {
            console.warn(`${VERSION} updateProject: Ownership mismatch. Member ${memberId} attempted to edit project owned by ${existing._owner}.`);
            return { ok: false, error: { type: 'FORBIDDEN', message: 'You do not have permission to edit this project.' } };
        }

        // 3. Defensive merge — only allow editable fields; lock identity fields
        const updatePayload = {
            ...existing,
            title:           projectData.title,
            description:     projectData.description,
            goal:            projectData.goal,
            offer:           projectData.offer,
            target_audience: projectData.target_audience,
            misconception:   projectData.misconception,
            _id:             existing._id,    // Lock ID
            _owner:          existing._owner  // Lock ownership
        };

        const result = await wixData.update(COLLECTION_PROJECTS, updatePayload, DB_OPTIONS);

        console.log(`${VERSION} Project updated: ${result._id} by member: ${memberId}`);
        return { ok: true, data: result };

    } catch (err) {
        console.error(`${VERSION} updateProject failure:`, err);
        return { ok: false, error: { type: 'INTERNAL', message: err.message } };
    }
});

export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) return { ok: true, count: 0 };

        const count = await wixData.query(COLLECTION_PROJECTS)
            .eq("owner", memberId)
            .count(DB_OPTIONS);

        console.log(`${VERSION} Project count retrieved for ${memberId}: ${count}`);
        return { ok: true, count };
    } catch (err) {
        console.error(`${VERSION} getUserProjectCount error:`, err);
        return { ok: false, count: 0, error: err.message };
    }
});

export const getMyProjects = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) return { ok: true, data: [] };

        const results = await wixData.query(COLLECTION_PROJECTS)
            .eq("owner", memberId)
            .descending("_createdDate")
            .find(DB_OPTIONS);

        console.log(`${VERSION} Project list retrieved for ${memberId}. Count: ${results.items.length}`);
        return { ok: true, data: results.items };
    } catch (err) {
        console.error(`${VERSION} getMyProjects error:`, err);
        return { ok: false, data: [], error: err.message };
    }
});