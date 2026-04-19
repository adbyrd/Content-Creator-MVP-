/**
 * Page Code: Auth Gate
 * /page_code/marketing/auth-gate.page.js 
 * @version 1.0.1
 * @updated 2026-04-04
 */

import wixLocation from 'wix-location';
import { checkMemberExists } from 'backend/services/profile.web.js';

const VERSION = '[Auth Gate: v1.0.0]';
const MSG_ERROR_GENERIC = 'Technical error encountered. Please try again later.';

$w.onReady(function () {
    bootUI();
    wireEventHandlers();
});

function bootUI() {}

function wireEventHandlers() {
    $w("#memberCheck").onClick(async () => {
        await handleMemberCheck();
    });
}

async function handleMemberCheck() {
    // 1. Sanitize input (Trim whitespace)
    const rawEmail = $w("#memberEmail").value;
    const email = rawEmail ? rawEmail.trim() : "";

    if (!email || !$w("#memberEmail").valid) {
        $w("#memberEmail").updateValidityIndication();
        return;
    }

    safeExpand("#ccPreCheck");
    safeDisable("#memberCheck", true);

    try {
        // 2. Execute Backend Check
        const { ok, exists } = await checkMemberExists(email);

        if (ok && exists) {
            // Success: Move to their dashboard/profile
            wixLocation.to("/dashboard/profilesetting");
        } else {
            // Failure or New User: Move to onboarding
            console.info(`[AuthGate] No profile found for ${email}. Redirecting to pricing.`);
            wixLocation.to("/pricing-plans");
        }
    } catch (err) {
        console.error(`[AuthGate] Critical Error:`, err);
        wixLocation.to("/pricing-plans"); // Safety fallback
    } finally {
        safeDisable("#memberCheck", false);
    }
}

function safeDisable(selector, disabled = true) {
    const el = $w(selector);
    if (el && typeof el.disable === 'function') {
        disabled ? el.disable() : el.enable();
    }
}

function safeExpand(selector) {
    const el = $w(selector);
    if (el && typeof el.expand === 'function') el.expand();
}

function safeCollapse(selector) {
    const el = $w(selector);
    if (el && typeof el.collapse === 'function') el.collapse();
}

function showUserError(message) {
    // Standards require central error logging [cite: 137, 262]
    console.warn(`${VERSION} User Error Displayed: ${message}`);
}