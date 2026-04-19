/**
 * Backend Service: Profile Management
 * Path: /backend/services/profile.web.js
 * Version: [cc-v.1.0.5]
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const PROFILES_COLLECTION = 'profiles';
const ERR_NOT_AUTHENTICATED = "USER_AUTH_REQUIRED";
const ERR_UPDATE_FAILED = "PROFILE_UPDATE_FAILURE";

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
        console.error(`[cc-v.1.0.5] getProfile failed:`, err);
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
            console.log(`[cc-v.1.0.5][req-${requestId}] Identity Hub patched successfully.`);
        } else {
            finalData = {
                ...payload.profile,
                _owner: currentUser,
                lastUpdated: new Date()
            };
            result = await wixData.insert(PROFILES_COLLECTION, finalData, { suppressAuth: true });
            console.log(`[cc-v.1.0.5][req-${requestId}] New Identity Hub created.`);
        }

        return { ok: true, status: 200, data: result };

    } catch (err) {
        console.error(`[cc-v.1.0.5][req-${requestId}] ${ERR_UPDATE_FAILED}:`, err);
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