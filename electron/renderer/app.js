(function () {

    const electronAPI =
        window.electronAPI;

    const dom =
        window.BroadcastRendererDom.getElements();

    const state = {
        contacts: [],
        mediaFile: null,
        currentBroadcastState: "IDLE",
        unsafeControlsDisabled: false
    };

    let contactFilesUI = null;
    let validationUI = null;
    let broadcastControls = null;
    let connectionUI = null;

    const showToast =
        window.BroadcastRendererToast.createToast({
            toastContainer:
                dom.toastContainer
        });

    const navigationUI =
        window.BroadcastRendererNavigation
            .createNavigationUI({
                dom,
                getContactFilesUI
            });

    const providerUI =
        window.BroadcastRendererProvider
            .createProviderUI({
                providerSelect:
                    dom.providerSelect,
                defaultProvider:
                    "whatsapp",
                onProviderChange:
                    async () => {
                        validationUI.resetWarningDisplay();
                        await validationUI.refresh();
                    }
            });

    validationUI =
        window.BroadcastRendererValidation
            .createValidationUI({
                dom,
                electronAPI,
                getSelectedProvider:
                    providerUI.getSelectedProvider,
                getContacts,
                getTemplate,
                getMediaFile
            });

    const qrUI =
        window.BroadcastRendererQr
            .createQrUI({
                dom,
                electronAPI,
                setTelegramConnectionStatus:
                    (text) => {
                        connectionUI.setTelegramConnectionStatus(
                            text
                        );
                    }
            });

    connectionUI =
        window.BroadcastRendererConnection
            .createConnectionUI({
                dom,
                electronAPI,
                qrUI,
                showToast,
                onBroadcastButtonsRefresh:
                    () => {
                        if (broadcastControls) {

                            broadcastControls.updateButtons(
                                state.currentBroadcastState
                            );
                        }
                    }
            });

    contactFilesUI =
        window.createContactFilesUI({
            getBroadcastState,
            refreshValidationWarnings:
                () => validationUI.refresh(),
            setContacts,
            setStatusText,
            showContactsPage:
                () => navigationUI.showPage("contacts"),
            showEditorPage:
                () => navigationUI.showPage("editor"),
            showSenderPage:
                () => navigationUI.showPage("sender"),
            showToast
        });

    const contactsUI =
        window.BroadcastRendererContacts
            .createContactsUI({
                dom,
                electronAPI,
                getSelectedProvider:
                    providerUI.getSelectedProvider,
                getContactFilesUI,
                setContacts,
                resetValidationWarnings:
                    validationUI.resetWarningDisplay,
                refreshValidationWarnings:
                    validationUI.refresh,
                showPage:
                    navigationUI.showPage,
                showToast
            });

    const mediaUI =
        window.BroadcastRendererMedia
            .createMediaUI({
                dom,
                electronAPI,
                setMediaFile,
                refreshValidationWarnings:
                    validationUI.refresh,
                showToast
            });

    const previewUI =
        window.BroadcastRendererPreview
            .createPreviewUI({
                dom,
                electronAPI,
                getContacts,
                getTemplate,
                getMediaFile,
                getSelectedProvider:
                    providerUI.getSelectedProvider,
                showToast
            });

    const logsUI =
        window.BroadcastRendererLogs
            .createLogsUI({
                dom,
                electronAPI,
                showToast
            });

    const settingsUI =
        window.BroadcastRendererSettings
            .createSettingsUI({
                dom,
                electronAPI,
                getContactFilesUI,
                refreshValidationWarnings:
                    validationUI.refresh,
                showToast
            });

    broadcastControls =
        window.BroadcastRendererBroadcastControls
            .createBroadcastControlsUI({
                dom,
                electronAPI,
                getContacts,
                setContacts,
                getTemplate,
                getMediaFile,
                getSelectedProvider:
                    providerUI.getSelectedProvider,
                getBroadcastState,
                setBroadcastState,
                getContactFilesUI,
                setStatusText,
                setUnsafeControlsDisabled,
                validationUI,
                logsUI,
                showToast
            });

    navigationUI.register();
    providerUI.register();
    qrUI.register();
    connectionUI.register();
    validationUI.register();
    contactsUI.register();
    mediaUI.register();
    previewUI.register();
    logsUI.register();
    settingsUI.register();
    broadcastControls.register();

    settingsUI.loadAppSettings();
    connectionUI.setConnectionStatus("Not connected");
    broadcastControls.setBroadcastStatus("IDLE");
    broadcastControls.updateButtons("IDLE");

    function getContactFilesUI() {

        return contactFilesUI;
    }

    function getContacts() {

        return state.contacts;
    }

    function setContacts(
        nextContacts
    ) {

        state.contacts =
            Array.isArray(nextContacts)
                ? nextContacts
                : [];

        if (validationUI) {

            validationUI.resetWarningDisplay();
        }
    }

    function getMediaFile() {

        return state.mediaFile;
    }

    function setMediaFile(
        mediaFile
    ) {

        state.mediaFile =
            mediaFile;
    }

    function getTemplate() {

        return dom.templateInput.value;
    }

    function getBroadcastState() {

        return state.currentBroadcastState;
    }

    function setBroadcastState(
        nextState
    ) {

        state.currentBroadcastState =
            nextState;
    }

    function setStatusText(
        text
    ) {

        dom.status.innerText =
            text;
    }

    function setUnsafeControlsDisabled(
        disabled
    ) {

        state.unsafeControlsDisabled =
            disabled;

        [
            dom.addContactsFileBtn,
            dom.previewBtn,
            dom.mediaBtn,
            dom.saveTemplateBtn,
            dom.openSuccessLogsBtn,
            dom.openFailedLogsBtn,
            dom.cleanAllLogsBtn
        ].forEach(button => {

            button.disabled =
                disabled;
        });

        connectionUI.setUnsafeControlsDisabled(
            disabled
        );

        dom.templateInput.disabled =
            disabled;

        providerUI.setDisabled(
            disabled
        );

        if (contactFilesUI) {

            contactFilesUI.setUnsafeControlsDisabled(
                disabled
            );
        }
    }
})();
