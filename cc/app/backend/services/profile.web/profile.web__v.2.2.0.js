/**
 * Backend Service: Profile & Identity Management
 * Path: /backend/services/profile.web.js
 * Version: [ PROFILE SERVICE : v.2.4.0 ]
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const PROFILES_COLLECTION = 'profiles';
const MEMBERS_COLLECTION = 'Members/FullData'; // Native Wix members store
const MAX_RETRIES = 3;
const VERSION = "[ PROFILE SERVICE : v.2.4.0 ]";

async function executeQueryWithRetry(query, options = { suppressAuth: true }, attempts = 1) {
    try {
        return await query.find(options);
    } catch (err) {
        if (attempts < MAX_RETRIES) {
            const delay = Math.pow(2, attempts) * 100 + (Math.random() * 50);
            console.warn(`${VERSION} Query failed. Retrying in ${Math.round(delay)}ms... (Attempt ${attempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return executeQueryWithRetry(query, options, attempts + 1);
        }
        throw err;
    }
}

export const checkMemberExists = webMethod(Permissions.Anyone, async (email) => {
    try {
        if (!email) {
            console.warn(`${VERSION} checkMemberExists called without email.`);
            return { ok: false, error: "EMAIL_REQUIRED" };
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Query native Wix members store directly via wixData.
        // 'loginEmail' is the canonical email field on Members/FullData.
        // suppressAuth is required — caller is unauthenticated at this point.
        const query = wixData.query(MEMBERS_COLLECTION)
            .eq("loginEmail", normalizedEmail);

        const { items } = await executeQueryWithRetry(query, { suppressAuth: true });

        const exists = items.length > 0;
        console.log(`${VERSION} Members/FullData identity check for ${normalizedEmail}: ${exists ? 'FOUND' : 'NOT_FOUND'}`);

        return { ok: true, exists };

    } catch (err) {
        console.error(`${VERSION} Identity check failed:`, err);
        return { ok: false, error: err.message };
    }
});

export const getProfile = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getCurrentMemberId();
        if (!memberId) {
            console.warn(`${VERSION} Unauthorized access attempt to getProfile.`);
            return { ok: false, error: 'AUTH_REQUIRED' };
        }

        const query = wixData.query(PROFILES_COLLECTION).eq("_owner", memberId);
        const { items } = await executeQueryWithRetry(query);

        console.log(`${VERSION} Profile retrieved for owner: ${memberId}`);
        return { ok: true, data: items[0] || null };
    } catch (err) {
        console.error(`${VERSION} Error retrieving profile:`, err);
        return { ok: false, error: err.message };
    }
});

export const updateProfile = webMethod(Permissions.Anyone, async (payload) => {
    try {
        const memberId = await getCurrentMemberId();
        if (!memberId) {
            console.warn(`${VERSION} Unauthorized updateProfile attempt.`);
            return { ok: false, error: "AUTH_REQUIRED" };
        }

        const query = wixData.query(PROFILES_COLLECTION).eq('_owner', memberId);
        const currentRes = await executeQueryWithRetry(query);

        if (currentRes.items.length === 0) {
            console.error(`${VERSION} Update failed: No profile found for ${memberId}`);
            throw new Error("PROFILE_NOT_FOUND");
        }

        const original = currentRes.items[0];

        const updateData = {
            ...original,
            ...(payload.profile || {}),
            _id: original._id,
            _owner: memberId
        };

        const result = await wixData.update(PROFILES_COLLECTION, updateData, { suppressAuth: true });

        console.log(`${VERSION} Profile updated for owner: ${memberId}`);
        return { ok: true, data: result };

    } catch (err) {
        console.error(`${VERSION} updateProfile failed:`, err);
        return { ok: false, error: err.message };
    }
});

async function getCurrentMemberId() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
        return member ? member._id : null;
    } catch (err) {
        console.error(`${VERSION} Internal Identity retrieval failure:`, err);
        return null;
    }
}