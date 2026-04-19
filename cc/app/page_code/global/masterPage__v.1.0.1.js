/**
 * MASTER PAGE
 * Path: /page_code/global/masterPage.js
 * @version 1.0.1
 */

import { showToaster } from 'public/utils/notification.js';
import wixWindow from 'wix-window';

const VERSION = 'v.1.0.1';
const PREFIX = `[masterPage-${VERSION}]`;

$w.onReady(function () {
    console.log(`${PREFIX} Initialization Started`);
    bootUI();
    
    wixWindow.onMessage((event) => {
        if (event.data.type === "SHOW_MODAL_ERROR") {
            showModalError(event.data.message);
        }
    });
});

export function showModalError(message) {
    const $container = $w('#errorContainer');
    const $text = $w('#errorModalMsg');

    if ($container && $text) {
        $text.text = message;
        
        if (typeof $container.expand === 'function') {
            $container.expand();
        }

        setTimeout(() => {
            if (typeof $container.collapse === 'function') {
                $container.collapse();
            }
        }, 5000);
    } else {
        console.warn(`${PREFIX} Global error elements (#errorContainer or #errorModalMsg) missing.`);
    }
}

function bootUI() {
    try {
        safeCollapse('#errorContainer');
        safeCollapse('#successToaster');
        wireEventHandlers();
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