(function () {

    function byId(id) {

        return document.getElementById(id);
    }

    function getElements() {

        return {
            addContactsFileBtn:
                byId("addContactsFileBtn"),
            broadcastStatus:
                byId("broadcastStatus"),
            cleanAllLogsBtn:
                byId("cleanAllLogsBtn"),
            connectBtn:
                byId("connectBtn"),
            connectTelegramBtn:
                byId("connectTelegramBtn"),
            connectionStatus:
                byId("connectionStatus"),
            connectionTile:
                byId("connectionTile"),
            connectionTimer:
                byId("connectionTimer"),
            contactEditorPage:
                byId("contactEditorPage"),
            contactsBackToSenderBtn:
                byId("contactsBackToSenderBtn"),
            contactsNavBtn:
                byId("contactsNavBtn"),
            contactsPage:
                byId("contactsPage"),
            failedCountEl:
                byId("failedCount"),
            logs:
                byId("logs"),
            mainPage:
                byId("mainPage"),
            mediaBtn:
                byId("mediaBtn"),
            mediaStatus:
                byId("mediaStatus"),
            openFailedLogsBtn:
                byId("openFailedLogsBtn"),
            openSuccessLogsBtn:
                byId("openSuccessLogsBtn"),
            pauseBtn:
                byId("pauseBtn"),
            previewBtn:
                byId("previewBtn"),
            previewContainer:
                byId("previewContainer"),
            progressBar:
                byId("progressBar"),
            progressText:
                byId("progressText"),
            providerSelect:
                byId("providerSelect"),
            qrImage:
                byId("qrImage"),
            resumeBtn:
                byId("resumeBtn"),
            retryFailedBtn:
                byId("retryFailedBtn"),
            saveTemplateBtn:
                byId("saveTemplateBtn"),
            senderNavBtn:
                byId("senderNavBtn"),
            skippedCountEl:
                byId("skippedCount"),
            startBtn:
                byId("startBtn"),
            status:
                byId("status"),
            stopBtn:
                byId("stopBtn"),
            successCountEl:
                byId("successCount"),
            telegramConnectionStatus:
                byId("telegramConnectionStatus"),
            telegramLoginLink:
                byId("telegramLoginLink"),
            telegramQrImage:
                byId("telegramQrImage"),
            telegramQrPanel:
                byId("telegramQrPanel"),
            templateInput:
                byId("templateInput"),
            toastContainer:
                byId("toastContainer"),
            validationPanel:
                byId("validationPanel"),
            validationSummary:
                byId("validationSummary"),
            validationWarnings:
                byId("validationWarnings")
        };
    }

    window.BroadcastRendererDom = {
        byId,
        getElements
    };
})();
