/**
 * Utility: Notifications & User Feedback
 * Path: /public/utils/notifications.js
 * Version: [cc-v.1.0.2]
 */

export const MSG_GENERIC_ERROR = "Something went wrong. Please try again or contact support.";
export const MSG_UPDATE_SUCCESS = "Settings updated successfully.";

export function showToaster(message = MSG_UPDATE_SUCCESS, type = 'success') {
    const $toaster = $w('#ccGlobalToaster');
    const $toasterText = $w('#ccToasterText');

    if (!$toaster || !$toasterText) {
        console.warn(`[cc-v.1.0.2] Toaster elements missing from page. Check masterPage.js.`);
        return;
    }

    $toasterText.text = message;

    if ($toaster.style) {
        if (type === 'error') {
            $toaster.style.backgroundColor = "#FFEBEE";
            if ($toasterText.style) $toasterText.style.color = "#C62828";
        } else {
            $toaster.style.backgroundColor = "#E8F5E9";
            if ($toasterText.style) $toasterText.style.color = "#2E7D32";
        }
    }

    if (typeof $toaster.expand === 'function') {
        $toaster.expand();
    }
    
    console.log(`[cc-v.1.0.2] User Notification: [${type}] ${message}`);

    setTimeout(() => {
        if (typeof $toaster.collapse === 'function') {
            $toaster.collapse();
        }
    }, 4000);
}

export function showError(message = MSG_GENERIC_ERROR, fieldSelector = null) {
    console.error(`[cc-v.1.0.2] Error Displayed: ${message}`);

    if (!fieldSelector) {
        showToaster(message, 'error');
        return;
    }

    const $errEl = $w(fieldSelector);
    if ($errEl && typeof $errEl.expand === 'function') {
        $errEl.text = message;
        $errEl.expand();
        
        setTimeout(() => $errEl.collapse(), 6000);
    }
}

export function debugNotifications() {
    console.log('[cc-v.1.0.2] Debug: Testing Toaster...');
    showToaster("Debug: System notification test.");
}

