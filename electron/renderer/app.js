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
                electronAPI,
                getContactFilesUI
            });

    const providerUI =
        window.BroadcastRendererProvider
            .createProviderUI({
                providerSelect:
                    dom.providerSelect,
                providerControl:
                    dom.providerControl,
                templateInput:
                    dom.templateInput,
                templatesPanel:
                    dom.templatesPanel,
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
                getSelectedProvider:
                    providerUI.getSelectedProvider,
                initializeChannelTemplates:
                    providerUI.initializeChannelTemplates,
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

    const editorToolbar =
        window.BroadcastRendererEditorToolbar
            .createEditorToolbar({
                dom
            });

    const desktopChrome =
        window.BroadcastRendererDesktopChrome
            .createDesktopChrome({
                dom
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
    editorToolbar.register();
    desktopChrome.register();
    registerUpdateUI();

    settingsUI.loadAppSettings();
    loadAppVersion();
    connectionUI.setConnectionStatus("Not connected");
    broadcastControls.setBroadcastStatus("IDLE");
    broadcastControls.updateButtons("IDLE");

    function registerUpdateUI() {

        let availableVersion = "";
        let updateState = "available";

        function renderUpdateDialog() {

            const ready =
                updateState === "downloaded";
            const downloading =
                updateState === "downloading";

            dom.updateDialogEyebrow.innerText =
                ready
                    ? "Ready to install"
                    : downloading
                        ? "Downloading update"
                        : "Update available";
            dom.updateDialogTitle.innerText =
                ready
                    ? "Your update is ready"
                    : downloading
                        ? "Getting the new version"
                        : "A new version is available";
            dom.updateDialogMessage.innerText =
                ready
                    ? "Restart Broadcast Sender to finish installing the update."
                    : downloading
                        ? "You can keep this window open while the update downloads."
                        : "Get the latest improvements now, or stay on your current version and update later.";
            dom.updateDialogVersion.innerText =
                availableVersion
                    ? `v${availableVersion}`
                    : "New version";
            dom.updatePrimaryBtn.innerText =
                ready
                    ? "Restart and install"
                    : downloading
                        ? "Downloading…"
                        : "Download update";
            dom.updatePrimaryBtn.disabled =
                downloading;
            dom.updateLaterBtn.innerText =
                ready
                    ? "Restart later"
                    : "Stay on this version";
            dom.updateProgressWrap.classList.toggle(
                "hidden",
                !downloading
            );
        }

        function showUpdateDialog() {

            renderUpdateDialog();
            dom.updateDialogBackdrop.classList.remove(
                "hidden"
            );
            dom.updatePrimaryBtn.focus();
        }

        function hideUpdateDialog() {

            dom.updateDialogBackdrop.classList.add(
                "hidden"
            );
        }

        function showFooterUpdateMarker() {

            dom.statusBarUpdate.innerText =
                updateState === "downloaded"
                    ? `Update v${availableVersion} ready — click to restart`
                    : `Version ${availableVersion} available — click here to update`;
            dom.statusBarUpdate.classList.remove(
                "hidden"
            );
        }

        dom.updateLaterBtn.addEventListener(
            "click",
            () => {
                hideUpdateDialog();
                showFooterUpdateMarker();
            }
        );

        dom.statusBarUpdate.addEventListener(
            "click",
            showUpdateDialog
        );

        dom.updatePrimaryBtn.addEventListener(
            "click",
            async () => {

                if (updateState === "downloaded") {

                    const result =
                        await electronAPI.installUpdate({
                            silent: true,
                            forceRunAfter: true
                        });

                    if (!result?.success) {

                        showToast(
                            result?.error ||
                            "Could not install the update",
                            "error"
                        );
                    }

                    return;
                }

                updateState = "downloading";
                renderUpdateDialog();

                const result =
                    await electronAPI.downloadUpdate();

                if (!result?.success) {

                    updateState = "available";
                    renderUpdateDialog();
                    showFooterUpdateMarker();

                    showToast(
                        result?.error ||
                        "Could not download the update",
                        "error"
                    );
                }
            }
        );

        electronAPI.onUpdateAvailable(
            updateInfo => {

                availableVersion =
                    updateInfo?.version || "new";
                updateState = "available";
                showUpdateDialog();
            }
        );

        electronAPI.onUpdateDownloaded(
            updateInfo => {

                availableVersion =
                    updateInfo?.version ||
                    availableVersion ||
                    "new";
                updateState = "downloaded";
                dom.statusBarUpdate.classList.add("hidden");
                showUpdateDialog();
            }
        );

        electronAPI.onUpdateProgress(
            progress => {

                const percent =
                    Math.max(
                        0,
                        Math.min(
                            100,
                            Number(progress?.percent || 0)
                        )
                    );

                dom.updateProgressBar.style.width =
                    `${percent}%`;
                dom.updateProgressText.innerText =
                    `${Math.round(percent)}% downloaded`;
            }
        );

        electronAPI.onUpdateError(
            error => {

                showToast(
                    error?.message ||
                    "The update check failed",
                    "error"
                );
            }
        );
    }

    async function loadAppVersion() {

        if (!dom.appVersionLabel) {

            return;
        }

        try {

            const status =
                await electronAPI.getUpdateStatus();

            const version =
                status &&
                status.currentVersion;

            dom.appVersionLabel.innerText =
                version
                    ? `v${version}`
                    : "";

        } catch (_error) {

            dom.appVersionLabel.innerText =
                "";
        }
    }

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
            dom.contactsAddFileBtn,
            dom.contactsPreviewBtn,
            dom.previewBtn,
            dom.validateBtn,
            dom.mediaBtn,
            dom.removeMediaBtn,
            dom.saveTemplateBtn,
            dom.openSuccessLogsBtn,
            dom.openFailedLogsBtn,
            dom.cleanAllLogsBtn
        ].forEach(button => {

            if (!button) {

                return;
            }

            if (
                button === dom.removeMediaBtn &&
                !disabled &&
                dom.mediaStatus &&
                dom.mediaStatus.innerText === "No media selected"
            ) {

                button.disabled =
                    true;

                return;
            }

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
