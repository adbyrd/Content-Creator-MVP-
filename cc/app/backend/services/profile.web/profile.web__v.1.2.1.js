/**
 * Backend Service: Profile Management
 * Path: /backend/services/profile.web.js
 * Version: [Profile Management: v.1.1.0]
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const PROFILES_COLLECTION = 'profiles';
const ERR_NOT_AUTHENTICATED = "USER_AUTH_REQUIRED";
const ERR_UPDATE_FAILED = "PROFILE_UPDATE_FAILURE";
const MODULE_ID = '[Member Validation: v2.0.0]';
const MEMBERS_COLLECTION = 'Members/PrivateMembersData';
const MAX_RETRIES = 3;

export const getProfile = webMethod(Permissions.Anyone, async () => {
    try {
        const memberId = await getCurrentMemberId();
        if (!memberId) {
            return { ok: false, error: ERR_NOT_AUTHENTICATED };
        }

        const results = await wixData.query(PROFILES_COLLECTION)
            .eq('_owner', memberId)
            .find({ suppressAuth: true });

        return {
            ok: true,
            data: results.items.length > 0 ? results.items[0] : {}
        };
    } catch (err) {
        console.error(`[Profile Management: v.1.1.0] getProfile failed:`, err);
        return { ok: false, error: err.message };
    }
});

export const updateProfile = webMethod(Permissions.Anyone, async (payload) => {
    const requestId = Date.now().toString();
    
    try {
        const currentUser = await getCurrentMemberId();
        if (!currentUser) return { ok: false, error: ERR_NOT_AUTHENTICATED };

        if (!payload || !payload.profile) {
            throw new Error("Missing profile payload");
        }

        const existingProfile = await wixData.query(PROFILES_COLLECTION)
            .eq('_owner', currentUser)
            .find({ suppressAuth: true });

        let finalData;
        let result;

        if (existingProfile.items.length > 0) {
            const currentRecord = existingProfile.items[0];
            
            finalData = {
                ...currentRecord,
                ...payload.profile,
                _owner: currentUser,
                lastUpdated: new Date()
            };

            result = await wixData.update(PROFILES_COLLECTION, finalData, { suppressAuth: true });
            console.log(`[Profile Management: v.1.1.0][req-${requestId}] Identity Hub patched successfully.`);
        } else {
            finalData = {
                ...payload.profile,
                _owner: currentUser,
                lastUpdated: new Date()
            };
            result = await wixData.insert(PROFILES_COLLECTION, finalData, { suppressAuth: true });
            console.log(`[Profile Management: v.1.1.0][req-${requestId}] New Identity Hub created.`);
        }

        return { ok: true, status: 200, data: result };

    } catch (err) {
        console.error(`[Profile Management: v.1.1.0][req-${requestId}] ${ERR_UPDATE_FAILED}:`, err);
        return {
            ok: false,
            status: 500,
            error: { type: ERR_UPDATE_FAILED, message: err.message }
        };
    }
});

async function getCurrentMemberId() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
        return member ? member._id : null;
    } catch (err) {
        return null;
    }
}

export const checkMemberExists = webMethod(Permissions.Anyone, async (email) => {
    const requestId = Math.random().toString(36).substring(7);
    const PROFILES_COLLECTION = 'Members/PrivateMembersData'; // Standard System Collection

    try {
        // FIX: Use 'loginEmail' instead of 'email'
        const results = await wixData.query(PROFILES_COLLECTION)
            .eq("loginEmail", email.toLowerCase().trim()) 
            .limit(1)
            .find({ "suppressAuth": true }); // Required for PrivateMembersData

        return {
            ok: true,
            exists: results.items.length > 0,
            requestId
        };
    } catch (err) {
        console.error(`[Identity Service] [${requestId}] Query Failed:`, err);
        return { ok: false, exists: false, error: err.message };
    }
});

async function queryWithRetry(query, attempts = 1) {
    try {
        return await query.find({ suppressAuth: true });
    } catch (err) {
        if (attempts < MAX_RETRIES) {
            const delay = Math.pow(2, attempts) * 100 + (Math.random() * 50);
            console.warn(`${MODULE_ID} Query failed. Retrying in ${Math.round(delay)}ms... (Attempt ${attempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return queryWithRetry(query, attempts + 1);
        }
        throw err;
    }
}