/**
 * MASTER PAGE
 * Path: /page_code/global/masterPage.js
 * @version 1.0.0
 */

import { showToaster } from 'public/notification.js';

const VERSION = 'v1.0.0';
const PREFIX = `[masterPage-${VERSION}]`;

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

function wireEventHandlers() {
    // Logic for global buttons or header/footer elements would go here
}

function safeCollapse(selector) {
    const $el = $w(selector);
    if ($el && typeof $el.collapse === 'function') {
        $el.collapse();
    } else if ($el) {
        console.warn(`${PREFIX} Element ${selector} does not support .collapse()`);
    }
}

function safeExpand(selector) {
    const $el = $w(selector);
    if ($el && typeof $el.expand === 'function') {
        $el.expand();
    }
}

// --- DEBUG EXPORTS ---

export function debugGlobalToaster() {
    console.log(`${PREFIX} Debug: Triggering test notification...`);
    showToaster("System Check: Global Toaster is functional.", "success");
}