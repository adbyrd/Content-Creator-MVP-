/**
 * Brand
 * @version 0.0.1
 */

import wixWindowFrontend from 'wix-window-frontend';

const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

let _uploadedFileUrl = null;

$w.onReady(function () {
    const context = wixWindowFrontend.lightbox.getContext();
    
    if (context?.ccCompanyLogo) {
        $w('#imgLogoPreview').src = context.ccCompanyLogo;
        _uploadedFileUrl = context.ccCompanyLogo;
    }

    $w('#uploadProgressBar').value = 0;
    $w('#uploadProgressBar').hide();

    $w('#uploadButton').onChange(async () => {
        if ($w('#uploadButton').value.length > 0) {
            await handleFileUpload();
        }
    });

    $w('#btnSave').onClick(async () => {
        if (!_uploadedFileUrl) return;

        $w('#btnSave').disable();
        $w('#btnSave').label = "Saving...";

        try {
            await saveMemberBusinessProfile({ ccCompanyLogo: _uploadedFileUrl });
            wixWindowFrontend.lightbox.close(true);
        } catch (err) {
            console.error('[cc-v1.0.0] Save error:', err);
            $w('#btnSave').enable();
            $w('#btnSave').label = "Save Logo";
        }
    });

    $w('#btnCancel').onClick(() => wixWindowFrontend.lightbox.close(false));
});

async function handleFileUpload() {
    $w('#uploadProgressBar').show();
    $w('#uploadProgressBar').value = 10;

    try {
        const uploadResult = await $w('#uploadButton').startUpload();
        
        $w('#uploadProgressBar').value = 100;
        
        _uploadedFileUrl = uploadResult.url;
        $w('#imgLogoPreview').src = _uploadedFileUrl;
        
        console.log('[cc-v1.0.0] File uploaded successfully:', _uploadedFileUrl);

    } catch (uploadError) {
        console.error('[cc-v1.0.0] Upload failed:', uploadError);
        $w('#uploadProgressBar').hide();
    }
}