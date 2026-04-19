/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Version: [ PROJECT SERVICE : v.1.4.0 ]
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const VERSION = '[ PROJECT SERVICE : v.1.4.0 ]';
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
            _owner: memberId  // FIXED: use _owner to match Wix system field convention
        };

        const result = await wixData.insert(COLLECTION_PROJECTS, payload, DB_OPTIONS);
        console.log(`${VERSION} Project created: ${result._id} for member: ${memberId}`);
        return { ok: true, data: result };
    } catch (err) {
        console.error(`${VERSION} createProject failure:`, err);
        return { ok: false, error: err.message };
    }
});

export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getAuthenticatedMemberId();
        if (!memberId) return { ok: true, count: 0 };

        const count = await wixData.query(COLLECTION_PROJECTS)
            .eq("_owner", memberId)  // FIXED: query against _owner
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
            .eq("_owner", memberId)  // FIXED: query against _owner
            .descending("_createdDate")
            .find(DB_OPTIONS);

        console.log(`${VERSION} Project list retrieved for ${memberId}. Count: ${results.items.length}`);
        return { ok: true, data: results.items };
    } catch (err) {
        console.error(`${VERSION} getMyProjects error:`, err);
        return { ok: false, data: [], error: err.message };
    }
});