/**
 * Backend Service: Profile Management
 * Path: /backend/services/profile.web.js
 * Version: [cc-v2.0.2]
 */

import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { Permissions, webMethod } from 'wix-web-module';

const PROFILES_COLLECTION = 'profiles';
const ERR_NOT_AUTHENTICATED = "USER_AUTH_REQUIRED";
const ERR_UPDATE_FAILED = "PROFILE_UPDATE_FAILURE";

export const updateProfile = webMethod(Permissions.Anyone, async (payload) => {
    const requestId = Date.now().toString();
    
    try {
        console.log(`[cc-v2.0.2][req-${requestId}] Initiating profile update...`);

        if (!payload || !payload.profile) {
            return {
                ok: false,
                error: { type: 'INVALID_PAYLOAD', message: 'No profile data provided.' }
            };
        }

        // FIX: Now returns a valid string or null
        const currentUser = await getCurrentMemberId(); 
        
        if (!currentUser) {
            console.error(`[cc-v2.0.2][req-${requestId}] Unauthorized attempt to update profile.`);
            return { 
                ok: false, 
                error: { type: ERR_NOT_AUTHENTICATED, message: 'You must be logged in.' }
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
        } else {
            result = await wixData.insert(PROFILES_COLLECTION, profileData, { suppressAuth: true });
        }

        console.log(`[cc-v2.0.2][req-${requestId}] Profile successfully persisted.`);
        
        return {
            ok: true,
            status: 200,
            data: result
        };

    } catch (err) {
        console.error(`[cc-v2.0.2][req-${requestId}] ${ERR_UPDATE_FAILED}:`, err);
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
        console.error(`[cc-v2.0.2] Member retrieval error:`, err);
        return null;
    }
}

export const profileHealthCheck = webMethod(Permissions.Anyone, async () => {
    return { status: 'online', version: '2.0.2', timestamp: new Date() };
});