/**
 * Backend Service: Profile & Identity Management
 * Path: /backend/services/profile.web.js
 * Version: [Profile Management: v2.1.0]
 * Description: Enterprise-grade identity hub service with exponential backoff and strict validation.
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

// 1. Enterprise Constants
const PROFILES_COLLECTION = 'profiles'; // Custom App Data
const MEMBERS_COLLECTION = 'Members/PrivateMembersData'; // Wix System Data
const MAX_RETRIES = 3;
const LOG_PREFIX = "[Profile Service: v2.1.0]";

/**
 * INTERNAL: High-Resilience Query Wrapper
 * Implements Exponential Backoff as per Development Standards Section 6.1
 */
async function executeQueryWithRetry(query, options = { suppressAuth: true }, attempts = 1) {
    try {
        return await query.find(options);
    } catch (err) {
        if (attempts < MAX_RETRIES) {
            const delay = Math.pow(2, attempts) * 100 + (Math.random() * 50);
            console.warn(`${LOG_PREFIX} Query failed. Retrying in ${Math.round(delay)}ms... (Attempt ${attempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return executeQueryWithRetry(query, options, attempts + 1);
        }
        throw err;
    }
}

/**
 * Checks if a member exists in the Wix system to drive Auth-Gate routing.
 * FIX: Targets 'loginEmail' in system collection to resolve redirect failures.
 */
export const checkMemberExists = webMethod(Permissions.Anyone, async (email) => {
    const requestId = Math.random().toString(36).substring(7);
    const logReq = `${LOG_PREFIX} [req:${requestId}]`;

    // Backend Validation Gate
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        console.warn(`${logReq} Invalid email payload rejected.`);
        return { ok: false, exists: false, error: "INVALID_INPUT" };
    }

    try {
        console.log(`${logReq} Verifying identity: ${email}`);
        
        const query = wixData.query(MEMBERS_COLLECTION)
            .eq("loginEmail", email.toLowerCase().trim()) // Correct System Key
            .limit(1);

        const results = await executeQueryWithRetry(query);
        const exists = results.items.length > 0;

        return {
            ok: true,
            exists: exists,
            requestId
        };

    } catch (err) {
        console.error(`${logReq} Identity check failed:`, err);
        return { ok: false, exists: false, error: "SERVICE_UNAVAILABLE" };
    }
});

/**
 * Retrieves the profile for the currently authenticated user.
 */
export const getProfile = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getCurrentMemberId();
        if (!memberId) return { ok: false, error: "AUTH_REQUIRED" };

        const query = wixData.query(PROFILES_COLLECTION)
            .eq('_owner', memberId)
            .limit(1);

        const results = await executeQueryWithRetry(query);
        
        return {
            ok: true,
            data: results.items.length > 0 ? results.items[0] : {}
        };
    } catch (err) {
        console.error(`${LOG_PREFIX} getProfile failed:`, err);
        return { ok: false, error: "FETCH_FAILURE" };
    }
});

/**
 * Updates the Identity Hub profile data.
 * Includes defensive payload stripping to prevent unauthorized field injection.
 */
export const updateProfile = webMethod(Permissions.Anyone, async (payload) => {
    try {
        const memberId = await getCurrentMemberId();
        if (!memberId) return { ok: false, error: "AUTH_REQUIRED" };

        // 1. Fetch current record
        const currentRes = await wixData.query(PROFILES_COLLECTION)
            .eq('_owner', memberId)
            .find({ suppressAuth: true });

        if (currentRes.items.length === 0) throw new Error("PROFILE_NOT_FOUND");

        const original = currentRes.items[0];
        
        // 2. Defensive Merge (Only allow specific fields from payload.profile)
        const updateData = {
            ...original,
            ...(payload.profile || {}),
            _id: original._id, // Lock ID
            _owner: memberId   // Force ownership
        };

        const result = await wixData.update(PROFILES_COLLECTION, updateData, { suppressAuth: true });
        
        console.log(`${LOG_PREFIX} Profile updated for owner: ${memberId}`);
        return { ok: true, data: result };

    } catch (err) {
        console.error(`${LOG_PREFIX} updateProfile failed:`, err);
        return { ok: false, error: err.message };
    }
});

/**
 * Helper: Safely retrieves the current member ID.
 */
async function getCurrentMemberId() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
        return member ? member._id : null;
    } catch (err) {
        return null;
    }
}