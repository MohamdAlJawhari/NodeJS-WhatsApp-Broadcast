const connectBtn =
    document.getElementById(
        "connectBtn"
    );

const qrImage =
    document.getElementById(
        "qrImage"
    );

const connectionStatus =
    document.getElementById(
        "connectionStatus"
    );

const loadBtn =
    document.getElementById(
        "loadContactsBtn"
    );

const status =
    document.getElementById(
        "status"
    );

const previewBtn =
    document.getElementById(
        "previewBtn"
    );

const templateInput =
    document.getElementById(
        "templateInput"
    );

const previewContainer =
    document.getElementById(
        "previewContainer"
    );

const startBtn =
    document.getElementById(
        "startBtn"
    );

const logs =
    document.getElementById(
        "logs"
    );

const progressBar =
    document.getElementById(
        "progressBar"
    );

const progressText =
    document.getElementById(
        "progressText"
    );

const mediaBtn =
    document.getElementById(
        "mediaBtn"
    );

const mediaStatus =
    document.getElementById(
        "mediaStatus"
    );

const pauseBtn =
    document.getElementById(
        "pauseBtn"
    );

const resumeBtn =
    document.getElementById(
        "resumeBtn"
    );

const stopBtn =
    document.getElementById(
        "stopBtn"
    );

const saveTemplateBtn =
    document.getElementById(
        "saveTemplateBtn"
    );

const broadcastStatus =
    document.getElementById(
        "broadcastStatus"
    );

const successCountEl =
    document.getElementById(
        "successCount"
    );

const failedCountEl =
    document.getElementById(
        "failedCount"
    );

const skippedCountEl =
    document.getElementById(
        "skippedCount"
    );

const openSuccessLogsBtn =
    document.getElementById(
        "openSuccessLogsBtn"
    );

const cleanSuccessLogsBtn =
    document.getElementById(
        "cleanSuccessLogsBtn"
    );

const openFailedLogsBtn =
    document.getElementById(
        "openFailedLogsBtn"
    );

const cleanFailedLogsBtn =
    document.getElementById(
        "cleanFailedLogsBtn"
    );

const cleanSendLogsBtn =
    document.getElementById(
        "cleanSendLogsBtn"
    );

const retryFailedBtn =
    document.getElementById(
        "retryFailedBtn"
    );

const validationPanel =
    document.getElementById(
        "validationPanel"
    );

const validationSummary =
    document.getElementById(
        "validationSummary"
    );

const validationWarnings =
    document.getElementById(
        "validationWarnings"
    );

const toastContainer =
    document.getElementById(
        "toastContainer"
    );

let contacts = [];

let mediaFile = null;

let currentBroadcastState = "IDLE";

let stopRequested = false;

let broadcastStarting = false;

let validationRequestId = 0;

let validationTimer = null;

const contactFilesUI =
    window.createContactFilesUI({
        getBroadcastState: () => currentBroadcastState,
        refreshValidationWarnings: () =>
            refreshValidationWarnings(),
        setContacts: (nextContacts) => {
            contacts =
                nextContacts;
        },
        setStatusText: (text) => {
            status.innerText =
                text;
        },
        showToast
    });

loadBtn.addEventListener(
    "click",
    async () => {

        status.innerText =
            "Loading contacts...";

        const result =
            await window.electronAPI
                .selectContactsFile();

        if (!result.success) {

            status.innerText =
                result.error ||
                "File selection canceled";

            if (result.error) {

                showToast(
                    result.error,
                    "error"
                );
            }

            return;
        }

        contacts = result.contacts;

        contactFilesUI.clearSelectedContactFile();

        status.innerText =
            `Loaded ${result.count} contacts`;

        showToast(
            `Loaded ${result.count} contacts`,
            "success"
        );

        if (result.savedFilePath) {

            if (result.savedDuplicate) {

                showToast(
                    "Contact file already saved",
                    "info"
                );

            } else {

                showToast(
                    "Contact file saved",
                    "success"
                );
            }

        } else if (result.archiveError) {

            showToast(
                `Contact file was not saved: ${result.archiveError}`,
                "warning"
            );
        }

        await contactFilesUI.loadSavedContactFiles();

        await refreshValidationWarnings();
    }
);

previewBtn.addEventListener(
    "click",
    async () => {

        if (contacts.length === 0) {

            showToast(
                "Load contacts first",
                "warning"
            );

            return;
        }

        const template =
            templateInput.value;

        const preview =
            await window.electronAPI
                .generatePreview({

                    contacts,
                    template,
                    mediaFile
                });

        previewContainer.innerHTML =
            "";

        preview.forEach(item => {

            const div =
                document.createElement("div");

            div.className =
                "preview-card";

            div.innerHTML = `
        <strong>
          ${item.phone}
        </strong>

        <p>
          ${item.message}
        </p>
      `;

            previewContainer.appendChild(
                div
            );
        });
    }
);

mediaBtn.addEventListener(
    "click",
    async () => {

        const result =
            await window.electronAPI
                .selectMediaFile();

        if (!result.success) {

            return;
        }

        mediaFile =
            result.filePath;

        mediaStatus.innerText =
            mediaFile;

        showToast(
            "Media file selected",
            "success"
        );

        await refreshValidationWarnings();
    }
);

connectBtn.addEventListener(
    "click",
    async () => {

        connectionStatus.innerText =
            "Connecting...";

        const result =
            await window.electronAPI
                .connectWhatsApp();

        if (!result.success) {

            connectionStatus.innerText =
                result.error;

            showToast(
                result.error,
                "error"
            );
        }
    }
);

window.electronAPI.onQRCode(
    (qr) => {

        qrImage.src = qr;

        qrImage.style.display =
            "block";
    }
);

window.electronAPI
    .onConnectionStatus(
        (status) => {

            connectionStatus.innerText =
                status;

            if (
                status === "CONNECTED"
            ) {

                qrImage.style.display =
                    "none";

                showToast(
                    "WhatsApp connected",
                    "success"
                );
            }
        }
    );

window.electronAPI
    .onBroadcastCounters(
        (counters) => {

            updateCounters(
                counters
            );
        }
    );

startBtn.addEventListener(
    "click",
    async () => {

        if (contacts.length === 0) {

            showToast(
                "Load contacts first",
                "warning"
            );

            return;
        }

        await runBroadcast(
            contacts
        );
    }
);

openSuccessLogsBtn.addEventListener(
    "click",
    async () => {

        await openLogFolder(
            "success"
        );
    }
);

cleanSuccessLogsBtn.addEventListener(
    "click",
    async () => {

        await cleanLogFiles(
            "success"
        );
    }
);

openFailedLogsBtn.addEventListener(
    "click",
    async () => {

        await openLogFolder(
            "failed"
        );
    }
);

cleanFailedLogsBtn.addEventListener(
    "click",
    async () => {

        await cleanLogFiles(
            "failed"
        );
    }
);

cleanSendLogsBtn.addEventListener(
    "click",
    async () => {

        await cleanLogFiles(
            "send"
        );
    }
);

retryFailedBtn.addEventListener(
    "click",
    async () => {

        const result =
            await window.electronAPI
                .loadLatestFailedContacts();

        if (!result.success) {

            showToast(
                result.error ||
                "No failed contacts found",
                "warning"
            );

            return;
        }

        contacts =
            result.contacts;

        contactFilesUI.clearSelectedContactFile();

        status.innerText =
            `Loaded ${result.count} failed contacts for retry`;

        showToast(
            `Loaded ${result.count} failed contacts for retry`,
            "success"
        );

        await refreshValidationWarnings();

        await runBroadcast(
            contacts
        );
    }
);

pauseBtn.addEventListener(
    "click",
    async () => {

        await window.electronAPI
            .pauseBroadcast();

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
);

resumeBtn.addEventListener(
    "click",
    async () => {

        await window.electronAPI
            .resumeBroadcast();

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
);

stopBtn.addEventListener(
    "click",
    async () => {

        await window.electronAPI
            .stopBroadcast();

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
);

window.electronAPI
    .onBroadcastLog(
        (message) => {

            const div =
                document.createElement("div");

            div.className =
                "log-line";

            div.innerText =
                message;

            logs.appendChild(div);

            logs.scrollTop =
                logs.scrollHeight;
        }
    );

window.electronAPI
    .onBroadcastProgress(
        (progress) => {

            progressBar.value =
                progress;

            progressText.innerText =
                `${progress.toFixed(1)}%`;
        }
    );

saveTemplateBtn
    .addEventListener(
        "click",
        async () => {

            const template =
                templateInput.value;

            await window
                .electronAPI
                .saveTemplate(
                    template
                );

            showToast(
                "Default template saved",
                "success"
            );
        }
    );

templateInput.addEventListener(
    "input",
    () => {

        scheduleValidationRefresh();
    }
);

async function openLogFolder(
    kind
) {

    const result =
        await window.electronAPI
            .openLogFolder(kind);

    if (!result.success) {

        showToast(
            result.error ||
            "Could not open logs folder",
            "error"
        );

        return;
    }

    showToast(
        "Logs folder opened",
        "success"
    );
}

async function cleanLogFiles(
    kind
) {

    const labels = {
        success: "success",
        failed: "failed",
        send: "send"
    };

    const label =
        labels[kind] ||
        "selected";

    const fileType =
        kind === "send"
            ? "JSON"
            : "CSV";

    const confirmed =
        window.confirm(
            `Delete all saved ${label} ${fileType} logs?`
        );

    if (!confirmed) {

        return;
    }

    const result =
        await window.electronAPI
            .cleanLogFiles(kind);

    if (!result.success) {

        showToast(
            result.error ||
            `Could not clean ${label} logs`,
            "error"
        );

        return;
    }

    showToast(
        `Deleted ${result.deletedCount} ${label} log file(s)`,
        "success"
    );
}

async function runBroadcast(
    targetContacts
) {

    if (targetContacts.length === 0) {

        showToast(
            "Load contacts first",
            "warning"
        );

        return;
    }

    if (
        broadcastStarting ||
        [
            "RUNNING",
            "PAUSED",
            "STOPPING"
        ].includes(currentBroadcastState)
    ) {

        showToast(
            "A broadcast is already active",
            "warning"
        );

        return;
    }

    broadcastStarting =
        true;

    startBtn.disabled =
        true;

    retryFailedBtn.disabled =
        true;

    setUnsafeControlsDisabled(
        true
    );

    clearTimeout(validationTimer);

    const validation =
        await refreshValidationWarnings(
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
            currentBroadcastState
        );

        return;
    }

    const template =
        templateInput.value;

    logs.innerHTML = "";

    progressBar.value = 0;

    progressText.innerText =
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
            await window.electronAPI
                .startBroadcast({

                    contacts: targetContacts,
                    template,
                    mediaFile
                });

    } catch (error) {

        result = {
            success: false,
            error: error.message
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
        currentBroadcastState
    );

    broadcastStarting =
        false;

    await refreshValidationWarnings();
}

function scheduleValidationRefresh() {

    clearTimeout(validationTimer);

    validationTimer =
        setTimeout(
            () => {
                refreshValidationWarnings();
            },
            300
        );
}

async function refreshValidationWarnings(
    targetContacts = contacts
) {

    const requestId =
        ++validationRequestId;

    try {

        const result =
            await window.electronAPI
                .validateBroadcastInput({

                    contacts: targetContacts,
                    template:
                        templateInput.value,
                    mediaFile
                });

        if (
            requestId !==
            validationRequestId
        ) {

            return null;
        }

        renderValidationWarnings(
            result
        );

        return result;

    } catch (error) {

        const result = {
            valid: false,
            warnings: [
                {
                    type: "error",
                    title: "Validation failed",
                    message: error.message
                }
            ],
            summary: {
                totalContacts:
                    targetContacts.length,
                validPhones: 0,
                invalidPhones: 0,
                duplicatePhones: 0
            }
        };

        renderValidationWarnings(
            result
        );

        return result;
    }
}

function renderValidationWarnings(
    result
) {

    const warnings =
        result.warnings || [];

    const summary =
        result.summary || {
            totalContacts: 0,
            validPhones: 0,
            invalidPhones: 0,
            duplicatePhones: 0
        };

    validationWarnings.innerHTML =
        "";

    validationPanel.className =
        "validation-panel";

    if (warnings.length === 0) {

        validationPanel.classList.add(
            "validation-panel-empty"
        );

        validationSummary.innerText =
            summary.totalContacts > 0
                ? `${summary.totalContacts} contacts ready`
                : "No contacts loaded";

        return;
    }

    if (
        warnings.some(warning => {
            return warning.type === "error";
        })
    ) {

        validationPanel.classList.add(
            "validation-panel-error"
        );

    } else {

        validationPanel.classList.add(
            "validation-panel-warning"
        );
    }

    validationSummary.innerText =
        `${summary.totalContacts} contacts, ${summary.validPhones} valid, ${summary.invalidPhones} invalid, ${summary.duplicatePhones} duplicate`;

    warnings.forEach(warning => {

        const item =
            document.createElement("li");

        item.className =
            `validation-item validation-${warning.type}`;

        const title =
            document.createElement("strong");

        title.innerText =
            warning.title;

        const message =
            document.createElement("p");

        message.innerText =
            warning.message;

        item.appendChild(title);
        item.appendChild(message);

        if (
            warning.details &&
            warning.details.length > 0
        ) {

            const details =
                document.createElement("ul");

            details.className =
                "validation-details";

            warning.details.forEach(detail => {

                const detailItem =
                    document.createElement("li");

                detailItem.innerText =
                    detail;

                details.appendChild(
                    detailItem
                );
            });

            item.appendChild(details);
        }

        validationWarnings.appendChild(
            item
        );
    });
}

function showToast(
    message,
    type = "info"
) {

    const toast =
        document.createElement("div");

    toast.className =
        `toast toast-${type}`;

    toast.innerText =
        message;

    toast.addEventListener(
        "click",
        () => {
            toast.remove();
        }
    );

    toastContainer.appendChild(
        toast
    );

    setTimeout(
        () => {
            toast.classList.add(
                "toast-hide"
            );

            setTimeout(
                () => {
                    toast.remove();
                },
                200
            );
        },
        4500
    );
}

async function loadAppSettings() {

    const settings =
        await window.electronAPI
            .loadSettings();

    templateInput.value =
        settings.defaultTemplate;

    await contactFilesUI.loadSavedContactFiles();

    await refreshValidationWarnings();
}

function setBroadcastStatus(
    status
) {

    currentBroadcastState =
        status;

    broadcastStatus.innerText =
        status;

    broadcastStatus.className =
        "";

    broadcastStatus.classList.add(
        `status-${status.toLowerCase()}`
    );
}

function setUnsafeControlsDisabled(
    disabled
) {

    [
        loadBtn,
        connectBtn,
        previewBtn,
        mediaBtn,
        saveTemplateBtn,
        openSuccessLogsBtn,
        cleanSuccessLogsBtn,
        openFailedLogsBtn,
        cleanFailedLogsBtn,
        cleanSendLogsBtn
    ].forEach(button => {

        button.disabled =
            disabled;
    });

    templateInput.disabled =
        disabled;

    contactFilesUI.setUnsafeControlsDisabled(
        disabled
    );
}

function updateButtons(
    state
) {

    const activeSendStates = [
        "RUNNING",
        "PAUSED",
        "STOPPING"
    ];

    setUnsafeControlsDisabled(
        activeSendStates.includes(state)
    );

    if (state === "IDLE") {

        startBtn.disabled =
            false;

        pauseBtn.disabled =
            true;

        resumeBtn.disabled =
            true;

        stopBtn.disabled =
            true;

        retryFailedBtn.disabled =
            false;
    }

    if (state === "RUNNING") {

        startBtn.disabled =
            true;

        pauseBtn.disabled =
            false;

        resumeBtn.disabled =
            true;

        stopBtn.disabled =
            false;

        retryFailedBtn.disabled =
            true;
    }

    if (state === "PAUSED") {

        startBtn.disabled =
            true;

        pauseBtn.disabled =
            true;

        resumeBtn.disabled =
            false;

        stopBtn.disabled =
            false;

        retryFailedBtn.disabled =
            true;
    }

    if (state === "STOPPING") {

        startBtn.disabled =
            true;

        pauseBtn.disabled =
            true;

        resumeBtn.disabled =
            true;

        stopBtn.disabled =
            true;

        retryFailedBtn.disabled =
            true;
    }

    if (
        state === "STOPPED" ||
        state === "COMPLETED"
    ) {

        startBtn.disabled =
            false;

        pauseBtn.disabled =
            true;

        resumeBtn.disabled =
            true;

        stopBtn.disabled =
            true;

        retryFailedBtn.disabled =
            false;
    }
}

function updateCounters(
    counters
) {

    successCountEl.innerText =
        counters.success;

    failedCountEl.innerText =
        counters.failed;

    skippedCountEl.innerText =
        counters.skipped;
}

loadAppSettings();
setBroadcastStatus("IDLE");
updateButtons("IDLE");
