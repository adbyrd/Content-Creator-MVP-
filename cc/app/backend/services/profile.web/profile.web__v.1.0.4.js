/**
 * Backend Service: Profile Management
 * Path: /backend/services/profile.web.js
 * Version: [cc-v.1.0.4]
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
        console.error(`[cc-v2.1.3] getProfile failed:`, err);
        return { ok: false, error: err.message };
    }
});

export const updateProfile = webMethod(Permissions.Anyone, async (payload) => {
    const requestId = Date.now().toString();
    
    try {
        console.log(`[cc-v2.1.3][req-${requestId}] Initiating profile update...`);

        if (!payload || !payload.profile) {
            return {
                ok: false,
                error: { type: 'INVALID_PAYLOAD', message: 'No profile data provided.' }
            };
        }

        const currentUser = await getCurrentMemberId(); 
        
        if (!currentUser) {
            console.error(`[cc-v2.1.3][req-${requestId}] Unauthorized attempt.`);
            return { 
                ok: false, 
                error: { type: ERR_NOT_AUTHENTICATED, message: 'You must be logged in to update settings.' }
            };
        }

        const existingProfile = await wixData.query(PROFILES_COLLECTION)
            .eq('_owner', currentUser)
            .find({ suppressAuth: true });

        const profileData = {
            ...payload.profile,
            _owner: currentUser,
            lastUpdated: new Date()
        };

        let result;
        if (existingProfile.items.length > 0) {
            profileData._id = existingProfile.items[0]._id;
            result = await wixData.update(PROFILES_COLLECTION, profileData, { suppressAuth: true });
            console.log(`[cc-v2.1.3][req-${requestId}] Existing profile updated.`);
        } else {
            result = await wixData.insert(PROFILES_COLLECTION, profileData, { suppressAuth: true });
            console.log(`[cc-v2.1.3][req-${requestId}] New profile created.`);
        }

        return {
            ok: true,
            status: 200,
            data: result
        };

    } catch (err) {
        console.error(`[cc-v2.1.3][req-${requestId}] ${ERR_UPDATE_FAILED}:`, err);
        return {
            ok: false,
            status: 500,
            error: { 
                type: ERR_UPDATE_FAILED, 
                message: 'Internal server error during profile save.' 
            }
        };
    }
});

async function getCurrentMemberId() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
        return member ? member._id : null;
    } catch (err) {
        console.error(`[cc-v2.1.3] Member Auth Check Failed:`, err);
        return null;
    }
}