/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Description: Backend logic for managing user projects in the Content Creator ecosystem.
 * Version: [cc-v1.0.1]
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';

const COLLECTION_PROJECTS = "projects";
const DB_OPTIONS = { suppressAuth: true };

export const createProject = webMethod(Permissions.Anyone, async (projectData) => {
    try {
        console.log(`[cc-v1.0.1] Attempting elevated insert for: ${projectData.title}`);

        const payload = {
            title: projectData.title,
            description: projectData.description,
            goal: projectData.goal,
            offer: projectData.offer,
            target_audience: projectData.audience,
            misconception: projectData.misconception
        };

        const result = await wixData.insert(COLLECTION_PROJECTS, payload, DB_OPTIONS);
        
        return { ok: true, data: result };
    } catch (err) {
        console.error(`[cc-v1.0.1] Backend Error:`, err);
        return { ok: false, error: err.message };
    }
});

export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        const count = await wixData.query(COLLECTION_PROJECTS).count(DB_OPTIONS);
        return { ok: true, count };
    } catch (err) {
        console.error(`[cc-v1.0.1] Error fetching count:`, err);
        return { ok: false, count: 0 };
    }
});