/**
 * Utility: Shared UI Logic
 * Path: /public/utils/ui.js
 * VERSION: [ UI LOGIC : v.1.1.2 ]
 */

const VERSION = '[ UI LOGIC : v.1.1.2 ]';

export function showModalError(message, pageObject) {
    const $container = pageObject('#errorContainer');
    const $text = pageObject('#errorModalMsg');

    if ($container && $text) {
        $text.text = message;
        
        if (typeof $container.expand === 'function') {
            $container.expand();
            console.log(`${VERSION} Error displayed: ${message}`);
        }

        setTimeout(() => {
            if (typeof $container.collapse === 'function') {
                $container.collapse();
            }
        }, 5000);
    } else {
        console.warn(`${VERSION} Error elements missing in this modal scope.`);
    }
}