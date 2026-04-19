/**
 * MASTER PAGE
 * Path: /page_code/global/masterPage.js
 * @version 1.0.3
 */

$w.onReady(function () {
    bootToaster();
});

function bootToaster() {
    const $toaster = $w('#globalToaster');
    if ($toaster) {
        $toaster.collapse();
    }
}