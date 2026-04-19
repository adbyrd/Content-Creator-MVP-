/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Description: Backend logic for managing user projects with strict ownership filtering and elevated DB permissions.
 * Version: [Project Service: v1.3.2]
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const COLLECTION_PROJECTS = "projects";
const DB_OPTIONS = { suppressAuth: true };

async function getAuthenticatedMemberId() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
        console.log('[Project Service] Authenticated ID:', member._id);
        return member ? member._id : null;
    } catch (err) {
        console.error('[Project Service: v1.3.2] Identity check failed:', err);
        return null;
    }
}

export const createProject = webMethod(Permissions.Anyone, async (projectData) => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) throw new Error("Unauthorized");

        const payload = {
            title: projectData.title,
            description: projectData.description,
            goal: projectData.goal,
            offer: projectData.offer,
            target_audience: projectData.audience, 
            misconception: projectData.misconception,
            owner: memberId 
        };

        const result = await wixData.insert(COLLECTION_PROJECTS, payload, DB_OPTIONS);
        return { ok: true, data: result };
    } catch (err) {
        console.error(`[Project Service] createProject Error:`, err);
        return { ok: false, error: err.message };
    }
});

export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) return { ok: true, count: 0 };

        const count = await wixData.query(COLLECTION_PROJECTS)
            .eq("owner", memberId)
            .count(DB_OPTIONS);

        return { ok: true, count };
    } catch (err) {
        console.error(`[Project Service: v1.3.2] getUserProjectCount Error:`, err);
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

        return { ok: true, data: results.items };
    } catch (err) {
        console.error(`[Project Service: v1.3.2] getMyProjects Error:`, err);
        return { ok: false, error: err.message };
    }
});