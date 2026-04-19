/**
 * Backend Service: Profile Management
 * Path: /backend/services/profile.web.js
 * Version: [cc-v.1.0.3]
 */

import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { Permissions, webMethod } from 'wix-web-module';

const PROFILES_COLLECTION = 'profiles';

export const updateProfile = webMethod(Permissions.Anyone, async (payload) => {
    try {
        const member = await currentMember.getMember();
        if (!member) throw new Error("USER_AUTH_REQUIRED");

        const profileData = {
            ...payload.profile,
            _owner: member._id,
            lastUpdated: new Date()
        };

        const existing = await wixData.query(PROFILES_COLLECTION).eq('_owner', member._id).find({ suppressAuth: true });

        if (existing.items.length > 0) {
            profileData._id = existing.items[0]._id;
            return { ok: true, data: await wixData.update(PROFILES_COLLECTION, profileData, { suppressAuth: true }) };
        } else {
            return { ok: true, data: await wixData.insert(PROFILES_COLLECTION, profileData, { suppressAuth: true }) };
        }
    } catch (err) {
        return { ok: false, error: { message: err.message } };
    }
});

async function getCurrentMemberId() {
    try {
        const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
        return member ? member._id : null;
    } catch (err) {
        console.error(`[cc-v.1.0.3] Member retrieval error:`, err);
        return null;
    }
}

export const profileHealthCheck = webMethod(Permissions.Anyone, async () => {
    return { status: 'online', version: '2.0.2', timestamp: new Date() };
});