(function () {

    const broadcastStatusLabels = {
        IDLE: "Ready",
        RUNNING: "Sending",
        PAUSED: "Paused",
        STOPPING: "Stopping",
        STOPPED: "Stopped",
        COMPLETED: "Completed"
    };

    const activeSendStates = [
        "RUNNING",
        "PAUSED",
        "STOPPING"
    ];

    function createBroadcastControlsUI({
        dom,
        electronAPI,
        getContacts,
        setContacts,
        getTemplate,
        getMediaFile,
        getSelectedProvider,
        getBroadcastState,
        setBroadcastState,
        getContactFilesUI,
        setStatusText,
        setUnsafeControlsDisabled,
        validationUI,
        logsUI,
        showToast
    }) {

        let stopRequested = false;
        let broadcastStarting = false;

        function register() {

            electronAPI.onBroadcastCounters(
                updateCounters
            );

            electronAPI.onBroadcastProgress(
                (progress) => {

                    dom.progressBar.value =
                        progress;

                    dom.progressText.innerText =
                        `${progress.toFixed(1)}%`;
                }
            );

            dom.startBtn.addEventListener(
                "click",
                async () => {

                    const contacts =
                        getContacts();

                    if (contacts.length === 0) {

                        showToast(
                            "Add or select contacts first",
                            "warning"
                        );

                        return;
                    }

                    await runBroadcast(
                        contacts
                    );
                }
            );

            dom.retryFailedBtn.addEventListener(
                "click",
                retryFailed
            );

            dom.pauseBtn.addEventListener(
                "click",
                pauseBroadcast
            );

            dom.resumeBtn.addEventListener(
                "click",
                resumeBroadcast
            );

            dom.stopBtn.addEventListener(
                "click",
                stopBroadcast
            );
        }

        async function retryFailed() {

            let result;
            try {
                result = await electronAPI.loadLatestFailedContacts();
            } catch (error) {
                showToast(
                    error.message || "Failed to load failed contacts",
                    "error"
                );
                return;
            }

            if (!result.success) {

                showToast(
                    result.error ||
                    "No failed contacts found",
                    "warning"
                );

                return;
            }

            setContacts(
                result.contacts
            );

            validationUI.resetWarningDisplay();

            const contactFilesUI =
                getContactFilesUI();

            if (contactFilesUI) {

                contactFilesUI.clearSelectedContactFile();
            }

            setStatusText(
                `Loaded ${result.count} failed contacts for retry`
            );

            updateContactsDisplay({
                count:
                    result.count,
                filePath:
                    result.filePath,
                statusText:
                    `Loaded ${result.count} failed contacts for retry`
            });

            showToast(
                `Loaded ${result.count} failed contacts for retry`,
                "success"
            );

            await validationUI.refresh();

            await runBroadcast(
                result.contacts
            );
        }

        async function pauseBroadcast() {
            try {
                await electronAPI.pauseBroadcast();
            } catch (error) {
                showToast(error.message || "Failed to pause broadcast", "error");
                return;
            }

            setBroadcastStatus(
                "PAUSED"
            );

            updateButtons(
                "PAUSED"
            );

            showToast(
                "Broadcast paused",
                "info"
            );
        }

        async function resumeBroadcast() {

            try {
                await electronAPI.resumeBroadcast();
            } catch (error) {
                showToast(error.message || "Failed to resume broadcast", "error");
                return;
            }

            setBroadcastStatus(
                "RUNNING"
            );

            updateButtons(
                "RUNNING"
            );

            showToast(
                "Broadcast resumed",
                "info"
            );
        }

        async function stopBroadcast() {

            try {
                await electronAPI.stopBroadcast();
            } catch (error) {
                showToast(error.message || "Failed to stop broadcast", "error");
                return;
            }

            stopRequested =
                true;

            setBroadcastStatus(
                "STOPPING"
            );

            updateButtons(
                "STOPPING"
            );

            showToast(
                "Stopping broadcast",
                "warning"
            );
        }

        async function runBroadcast(
            targetContacts
        ) {

            if (targetContacts.length === 0) {

                showToast(
                    "Add or select contacts first",
                    "warning"
                );

                return;
            }

            if (
                broadcastStarting ||
                activeSendStates.includes(
                    getBroadcastState()
                )
            ) {

                showToast(
                    "A broadcast is already active",
                    "warning"
                );

                return;
            }

            broadcastStarting =
                true;

            dom.startBtn.disabled =
                true;

            dom.retryFailedBtn.disabled =
                true;

            setUnsafeControlsDisabled(
                true
            );

            validationUI.clearTimer();

            const validation =
                await validationUI.refresh(
                    targetContacts
                );

            if (
                !validation ||
                !validation.valid
            ) {

                showToast(
                    "Fix validation errors before sending",
                    "error"
                );

                broadcastStarting =
                    false;

                updateButtons(
                    getBroadcastState()
                );

                return;
            }

            logsUI.clearLogs();

            dom.progressBar.value = 0;

            dom.progressText.innerText =
                "0%";

            stopRequested =
                false;

            setBroadcastStatus(
                "RUNNING"
            );

            updateButtons(
                "RUNNING"
            );

            updateCounters({
                success: 0,
                failed: 0,
                skipped: 0
            });

            showToast(
                "Broadcast started",
                "info"
            );

            let result;

            try {

                result =
                    await electronAPI
                        .startBroadcast({

                            provider:
                                getSelectedProvider(),
                            contacts:
                                targetContacts,
                            template:
                                getTemplate(),
                            mediaFile:
                                getMediaFile()
                        });

            } catch (error) {

                result = {
                    success: false,
                    error:
                        error.message
                };
            }

            if (!result.success) {

                showToast(
                    result.error ||
                    "Broadcast failed",
                    "error"
                );

                setBroadcastStatus(
                    "IDLE"
                );

                updateButtons(
                    "IDLE"
                );

                broadcastStarting =
                    false;

                return;
            }

            if (stopRequested) {

                setBroadcastStatus(
                    "STOPPED"
                );

                showToast(
                    "Broadcast stopped",
                    "warning"
                );

            } else {

                setBroadcastStatus(
                    "COMPLETED"
                );

                const counters =
                    result.counters;

                if (counters) {

                    showToast(
                        `Broadcast completed: ${counters.success} success, ${counters.failed} failed, ${counters.skipped} skipped`,
                        "success"
                    );

                } else {

                    showToast(
                        "Broadcast completed",
                        "success"
                    );
                }
            }

            updateButtons(
                getBroadcastState()
            );

            broadcastStarting =
                false;

            await validationUI.refresh();
        }

        function setBroadcastStatus(
            status
        ) {

            setBroadcastState(
                status
            );

            dom.broadcastStatus.innerText =
                broadcastStatusLabels[status] ||
                status;

            dom.broadcastStatus.className =
                "";

            dom.broadcastStatus.classList.add(
                `status-${status.toLowerCase()}`
            );
        }

        function updateButtons(
            state
        ) {

            setUnsafeControlsDisabled(
                activeSendStates.includes(state)
            );

            if (state === "IDLE") {

                dom.startBtn.disabled =
                    false;

                dom.pauseBtn.disabled =
                    true;

                dom.resumeBtn.disabled =
                    true;

                dom.stopBtn.disabled =
                    true;

                dom.retryFailedBtn.disabled =
                    false;
            }

            if (state === "RUNNING") {

                dom.startBtn.disabled =
                    true;

                dom.pauseBtn.disabled =
                    false;

                dom.resumeBtn.disabled =
                    true;

                dom.stopBtn.disabled =
                    false;

                dom.retryFailedBtn.disabled =
                    true;
            }

            if (state === "PAUSED") {

                dom.startBtn.disabled =
                    true;

                dom.pauseBtn.disabled =
                    true;

                dom.resumeBtn.disabled =
                    false;

                dom.stopBtn.disabled =
                    false;

                dom.retryFailedBtn.disabled =
                    true;
            }

            if (state === "STOPPING") {

                dom.startBtn.disabled =
                    true;

                dom.pauseBtn.disabled =
                    true;

                dom.resumeBtn.disabled =
                    true;

                dom.stopBtn.disabled =
                    true;

                dom.retryFailedBtn.disabled =
                    true;
            }

            if (
                state === "STOPPED" ||
                state === "COMPLETED"
            ) {

                dom.startBtn.disabled =
                    false;

                dom.pauseBtn.disabled =
                    true;

                dom.resumeBtn.disabled =
                    true;

                dom.stopBtn.disabled =
                    true;

                dom.retryFailedBtn.disabled =
                    false;
            }
        }

        function updateCounters(
            counters
        ) {

            dom.successCountEl.innerText =
                counters.success;

            dom.failedCountEl.innerText =
                counters.failed;

            dom.skippedCountEl.innerText =
                counters.skipped;
        }

        function updateContactsDisplay({
            count,
            filePath,
            statusText
        }) {

            if (
                dom.contactFileName &&
                filePath
            ) {

                dom.contactFileName.innerText =
                    getFileName(filePath);
            }

            if (
                dom.contactsCount &&
                Number.isFinite(count)
            ) {

                dom.contactsCount.innerText =
                    `${count} contacts`;
            }

            if (
                dom.status &&
                statusText
            ) {

                dom.status.innerText =
                    statusText;
            }
        }

        function getFileName(
            filePath
        ) {

            return String(filePath || "")
                .split(/[\\/]/)
                .filter(Boolean)
                .pop() ||
                "Contacts file";
        }

        return {
            register,
            retryFailed,
            runBroadcast,
            setBroadcastStatus,
            updateButtons,
            updateCounters
        };
    }

    window.BroadcastRendererBroadcastControls = {
        createBroadcastControlsUI
    };
})();
