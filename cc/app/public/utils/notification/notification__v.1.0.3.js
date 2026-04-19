/**
 * Utility: Notifications
 * Path: /public/utils/notifications.js
 * VERSION: [ NOTIFICATIONS : v.1.0.3 ]
 */

const VERSION = '[ NOTIFICATIONS : v.1.0.3 ]';

export function showToaster(message, type = 'success') {
    const $toaster = $w('#globalToaster');
    const $text = $w('#toasterMsg');

    // FIXED: check .expand is callable, not just that the reference exists.
    // $w() never returns null in Velo — it returns an inert object when the
    // element is absent from the page, so a simple truthiness check passes
    // even when the element does not exist on the canvas.
    if (!$toaster || typeof $toaster.expand !== 'function') {
        console.warn(`${VERSION} showToaster: #globalToaster not present on this page. Message: "${message}"`);
        return;
    }

    if (!$text || typeof $text.text === 'undefined') {
        console.warn(`${VERSION} showToaster: #toasterMsg not present on this page.`);
        return;
    }

    $text.text = message;

    if ($toaster.style) {
        $toaster.style.backgroundColor = (type === 'success') ? "#7bef8593" : "#FFEBEE";
    }

    $toaster.expand()
        .then(() => {
            setTimeout(() => {
                $toaster.collapse();
            }, 4000);
        })
        .catch((err) => {
            console.warn(`${VERSION} showToaster: expand/collapse failed:`, err);
        });
}