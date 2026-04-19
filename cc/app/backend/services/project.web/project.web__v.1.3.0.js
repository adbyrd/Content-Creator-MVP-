/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Description: Backend logic for managing user projects with strict ownership filtering and elevated DB permissions.
 * Version: [Project Service: v1.3.0]
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const COLLECTION_PROJECTS = "Projects";
const DB_OPTIONS = { suppressAuth: true }; // Bypasses WDE0027; logic handles security via memberId

/**
 * Helper: Securely retrieves the ID of the currently logged-in member.
 * Ensures data is only accessed by the legitimate owner.
 * @returns {Promise<string|null>}
 */
async function getAuthenticatedMemberId() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
        return member ? member._id : null;
    } catch (err) {
        console.error('[Project Service: v1.3.0] Identity check failed:', err);
        return null;
    }
}

/**
 * Creates a new project in the database.
 * Maps frontend payload to the 'projects.csv' schema.
 */
export const createProject = webMethod(Permissions.Anyone, async (projectData) => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) throw new Error("Unauthorized: User must be logged in.");

        console.log(`[Project Service: v1.3.0] Creating project for owner: ${memberId}`);

        const payload = {
            title: projectData.title,
            description: projectData.description,
            goal: projectData.goal,
            offer: projectData.offer,
            target_audience: projectData.audience,
            misconception: projectData.misconception,
            _owner: memberId // Explicitly set to ensure multi-tenancy isolation
        };

        const result = await wixData.insert(COLLECTION_PROJECTS, payload, DB_OPTIONS);
        
        return { ok: true, data: result };
    } catch (err) {
        console.error(`[Project Service: v1.3.0] createProject Error:`, err);
        return { ok: false, error: err.message };
    }
});

/**
 * Retrieves the total project count for the current user.
 * Ticket #2 & #4: Used for dashboard stats.
 */
export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) return { ok: true, count: 0 };

        const count = await wixData.query(COLLECTION_PROJECTS)
            .eq("_owner", memberId)
            .count(DB_OPTIONS);

        return { ok: true, count };
    } catch (err) {
        console.error(`[Project Service: v1.3.0] getUserProjectCount Error:`, err);
        return { ok: false, count: 0, error: err.message };
    }
});

/**
 * Fetches all projects belonging to the current user.
 * Ticket #5: Populates the Project Explorer repeater.
 */
export const getMyProjects = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) return { ok: true, data: [] };

        const results = await wixData.query(COLLECTION_PROJECTS)
            .eq("_owner", memberId)
            .descending("_createdDate")
            .find(DB_OPTIONS);

        return { ok: true, data: results.items };
    } catch (err) {
        console.error(`[Project Service: v1.3.0] getMyProjects Error:`, err);
        return { ok: false, error: err.message };
    }
});