/**
 * Service: Project Service
 * Path: /backend/services/project.web.js
 * Description: Backend logic for managing user projects in the Content Creator ecosystem.
 * Version: [cc-v1.0.0]
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';

const COLLECTION_PROJECTS = "projects";

/**
 * Creates a new project in the database.
 * @param {Object} projectData 
 */
export const createProject = webMethod(Permissions.Anyone, async (projectData) => {
    try {
        console.log(`[cc-v1.0.0] Creating new project: ${projectData.title}`);

        const payload = {
            title: projectData.title,
            description: projectData.description,
            goal: projectData.goal,
            offer: projectData.offer,
            target_audience: projectData.audience,
            misconception: projectData.misconception
        };

        const result = await wixData.insert(COLLECTION_PROJECTS, payload);
        
        return { ok: true, data: result };
    } catch (err) {
        console.error(`[cc-v1.0.0] Error saving project:`, err);
        return { ok: false, error: err.message };
    }
});

/**
 * Retrieves the total count of projects for the current user.
 */
export const getUserProjectCount = webMethod(Permissions.Anyone, async () => {
    try {
        // Querying based on the current owner of the records
        const count = await wixData.query(COLLECTION_PROJECTS).count();
        return { ok: true, count };
    } catch (err) {
        console.error(`[cc-v1.0.0] Error fetching project count:`, err);
        return { ok: false, count: 0 };
    }
});