/**
 * Page Code: Master Page (Global)
 * Path: /page_code/global/masterPage.js
 * Version: [ MASTER PAGE : v.1.2.0 ]]
 */

import wixLocation from 'wix-location';
import { checkMemberExists } from 'backend/services/profile.web.js';

const VERSION = '[ MASTER PAGE : v.1.2.0 ]';
const MSG_ERROR_GENERIC = 'Technical error encountered. Please try again later.';

$w.onReady(function () {
    console.log(`${VERSION} Global Master Page Initialized.`);
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
    const rawEmail = $w("#memberEmail").value;
    const email = rawEmail ? rawEmail.trim() : "";

    if (!email || !$w("#memberEmail").valid) {
        $w("#memberEmail").updateValidityIndication();
        return;
    }

    safeExpand("#ccPreCheck");
    safeDisable("#memberCheck", true);

    try {
        const { ok, exists } = await checkMemberExists(email);

        if (ok && exists) {
            console.log(`${VERSION} Identity verified for ${email}. Routing to dashboard.`);
            wixLocation.to("/dashboard/profilesetting");
        } else {
            console.info(`${VERSION} No profile found for ${email}. Redirecting to pricing.`);
            wixLocation.to("/pricing-plans");
        }
    } catch (err) {
        console.error(`${VERSION} Critical Auth Check Error:`, err);
        wixLocation.to("/pricing-plans"); 
    } finally {
        safeDisable("#memberCheck", false);
    }
}

function safeDisable(selector, disabled = true) {
    const el = $w(selector);
    if (el && typeof el.disable === 'function') {
        disabled ? el.disable() : el.enable();
    } else {
        console.warn(`${VERSION} safeDisable: Element ${selector} not found.`);
    }
}

function safeExpand(selector) {
    const el = $w(selector);
    if (el && typeof el.expand === 'function') el.expand();
}



// 



function safeCollapse(selector) {
    const el = $w(selector);
    if (el && typeof el.collapse === 'function') el.collapse();
}

function showUserError(message) {
    // Standards require central error logging [cite: 137, 262]
    console.warn(`${VERSION} User Error Displayed: ${message}`);
}