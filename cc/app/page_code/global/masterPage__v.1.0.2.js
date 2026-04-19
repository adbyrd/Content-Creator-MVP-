/**
 * MASTER PAGE
 * Path: /page_code/global/masterPage.js
 * @version 1.0.2
 */

import { showToaster } from 'public/utils/notification.js';

const VERSION = 'v1.0.2';
const PREFIX = `[ masterPage-${VERSION}]`;

$w.onReady(function () {
    console.log(`${PREFIX} Initialization Started`);
    bootUI();
});

function bootUI() {
    try {
        safeCollapse('#successToaster');
        
        wireEventHandlers();
        
        console.log(`${PREFIX} Site-wide UI ready.`);
    } catch (err) {
        console.error(`${PREFIX} Boot failed:`, err);
    }
}

function wireEventHandlers() {}

// --- SAFE UI HELPERS ---

function safeCollapse(selector) {
    const $el = $w(selector);
    if ($el && typeof $el.collapse === 'function') {
        $el.collapse();
    } else if ($el) {
        console.warn(`${PREFIX} Element ${selector} exists but does not support .collapse()`);
    }
}

function safeExpand(selector) {
    const $el = $w(selector);
    if ($el && typeof $el.expand === 'function') {
        $el.expand();
    }
}

// --- GLOBAL UTILITIES / DEBUG ---

export function debugGlobalToaster() {
    console.log(`${PREFIX} Debug: Triggering test notification...`);
    showToaster("System Check: Global Toaster is functional.", "success");
}