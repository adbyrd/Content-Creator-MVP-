/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Description: Backend logic for managing user projects in the Content Creator ecosystem.
 * Version: [Project Service: v1.1.0]
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend'; // Correct module for backend member data

const COLLECTION_PROJECTS = "projects";
const DB_OPTIONS = { suppressAuth: true };

async function getAuthenticatedMemberId() {
    const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
    return member ? member._id : null;
}

export const createProject = webMethod(Permissions.Anyone, async (projectData) => {
    try {
        const memberId = await getAuthenticatedMemberId();
        
        if (!memberId) throw new Error("Authentication required.");

        const payload = {
            ...projectData,
            _owner: memberId // Manually mapping the owner for strict isolation
        };

        const result = await wixData.insert(COLLECTION_PROJECTS, payload, DB_OPTIONS);
        return { ok: true, data: result };
    } catch (err) {
        console.error(`[Project Service: v1.1.0] Error in createProject:`, err);
        return { ok: false, error: err.message };
    }
});

export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getAuthenticatedMemberId();

        if (!memberId) {
            console.warn('[Project Service: v1.1.0] No logged-in member detected.');
            return { ok: true, count: 0 };
        }

        const count = await wixData.query(COLLECTION_PROJECTS)
            .eq("_owner", memberId)
            .count(DB_OPTIONS);

        return { ok: true, count };
    } catch (err) {
        console.error(`[Project Service: v1.1.0] Error in getUserProjectCount:`, err);
        return { ok: false, count: 0 };
    }
});

export const getMyProjects = webMethod(Permissions.Anyone, async () => {
    try {
        const userId = currentUser.id;
        if (!userId) return { ok: true, data: [] };

        const results = await wixData.query(COLLECTION_PROJECTS)
            .eq("_owner", userId)
            .descending("_createdDate")
            .find(DB_OPTIONS);

        return { ok: true, data: results.items };
    } catch (err) {
        console.error(`[Project Service: v1.1.0] Error fetching user projects:`, err);
        return { ok: false, error: err.message };
    }
});