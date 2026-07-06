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

const connectionTile =
    document.getElementById(
        "connectionTile"
    );

const connectionTimer =
    document.getElementById(
        "connectionTimer"
    );

const status =
    document.getElementById(
        "status"
    );

const providerSelect =
    document.getElementById(
        "providerSelect"
    );

const senderNavBtn =
    document.getElementById(
        "senderNavBtn"
    );

const contactsNavBtn =
    document.getElementById(
        "contactsNavBtn"
    );

const mainPage =
    document.getElementById(
        "mainPage"
    );

const contactsPage =
    document.getElementById(
        "contactsPage"
    );

const contactEditorPage =
    document.getElementById(
        "contactEditorPage"
    );

const addContactsFileBtn =
    document.getElementById(
        "addContactsFileBtn"
    );

const contactsBackToSenderBtn =
    document.getElementById(
        "contactsBackToSenderBtn"
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

const openFailedLogsBtn =
    document.getElementById(
        "openFailedLogsBtn"
    );

const cleanAllLogsBtn =
    document.getElementById(
        "cleanAllLogsBtn"
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

let isWhatsAppConnecting = false;

let isWhatsAppConnected = false;

let unsafeControlsDisabled = false;

let connectionStartedAt = null;

let connectionTimerId = null;

let currentBroadcastState = "IDLE";

let stopRequested = false;

let broadcastStarting = false;

let validationRequestId = 0;

let validationTimer = null;

let validationWarningsExpanded = false;

let currentValidationResult = null;

const validationWarningPreviewLimit = 5;

const DEFAULT_PROVIDER = "whatsapp";

const broadcastStatusLabels = {
    IDLE: "Ready",
    RUNNING: "Sending",
    PAUSED: "Paused",
    STOPPING: "Stopping",
    STOPPED: "Stopped",
    COMPLETED: "Completed"
};

const connectionStateClasses = [
    "connection-connected",
    "connection-connecting",
    "connection-waiting",
    "connection-error"
];

const contactFilesUI =
    window.createContactFilesUI({
        getBroadcastState: () => currentBroadcastState,
        refreshValidationWarnings: () =>
            refreshValidationWarnings(),
        setContacts: (nextContacts) => {
            contacts =
                nextContacts;
            resetValidationWarningDisplay();
        },
        setStatusText: (text) => {
            status.innerText =
                text;
        },
        showContactsPage: () =>
            showPage("contacts"),
        showEditorPage: () =>
            showPage("editor"),
        showSenderPage: () =>
            showPage("sender"),
        showToast
    });

addContactsFileBtn.addEventListener(
    "click",
    async () => {

        await loadContactsFile({
            showContactsPageAfterLoad: true
        });
    }
);

senderNavBtn.addEventListener(
    "click",
    () => {
        showPage("sender");
    }
);

contactsNavBtn.addEventListener(
    "click",
    async () => {
        await showPage("contacts");
    }
);

contactsBackToSenderBtn.addEventListener(
    "click",
    () => {
        showPage("sender");
    }
);

providerSelect.addEventListener(
    "change",
    async () => {

        resetValidationWarningDisplay();

        await refreshValidationWarnings();
    }
);

function getSelectedProvider() {

    return providerSelect.value ||
        DEFAULT_PROVIDER;
}

async function loadContactsFile({
    showContactsPageAfterLoad = false
} = {}) {

    status.innerText =
        "Loading contacts...";

    const result =
        await window.electronAPI
            .selectContactsFile({
                provider:
                    getSelectedProvider()
            });

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

    resetValidationWarningDisplay();

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

    if (showContactsPageAfterLoad) {

        await showPage("contacts");
    }
}

async function showPage(
    page
) {

    mainPage.classList.toggle(
        "hidden",
        page !== "sender"
    );

    contactsPage.classList.toggle(
        "hidden",
        page !== "contacts"
    );

    contactEditorPage.classList.toggle(
        "hidden",
        page !== "editor"
    );

    senderNavBtn.classList.toggle(
        "active",
        page === "sender"
    );

    contactsNavBtn.classList.toggle(
        "active",
        page === "contacts" ||
        page === "editor"
    );

    if (page === "contacts") {

        await contactFilesUI.loadSavedContactFiles();
    }
}

previewBtn.addEventListener(
    "click",
    async () => {

        if (contacts.length === 0) {

            showToast(
                "Add or select contacts first",
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
                    mediaFile,
                    provider:
                        getSelectedProvider()
                });

        previewContainer.innerHTML =
            "";

        preview.forEach(item => {

            const div =
                document.createElement("div");

            div.className =
                "preview-card";

            const phone =
                document.createElement("strong");

            phone.dir =
                "ltr";

            phone.innerText =
                item.phone;

            const message =
                document.createElement("p");

            message.dir =
                "auto";

            message.innerText =
                item.message;

            div.append(
                phone,
                message
            );

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

        if (isWhatsAppConnecting) {

            return;
        }

        if (isWhatsAppConnected) {

            showToast(
                "WhatsApp is already connected",
                "info"
            );

            return;
        }

        isWhatsAppConnecting =
            true;

        updateConnectButton();

        setConnectionStatus(
            "Connecting..."
        );

        startConnectionTimer();

        let result;

        try {

            result =
                await window.electronAPI
                    .connectWhatsApp();

        } catch (error) {

            result = {
                success: false,
                error:
                    error.message
            };
        }

        if (!result.success) {

            stopConnectionTimer(
                "Failed"
            );

            setConnectionStatus(
                result.error
            );

            showToast(
                result.error,
                "error"
            );

        } else {

            stopConnectionTimer(
                "Connected"
            );

            if (result.alreadyConnected) {

                setConnectionStatus(
                    "CONNECTED"
                );

                qrImage.style.display =
                    "none";

                showToast(
                    "WhatsApp is already connected",
                    "info"
                );
            }
        }

        isWhatsAppConnecting =
            false;

        updateButtons(
            currentBroadcastState
        );
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

            setConnectionStatus(
                status
            );

            if (
                status === "CONNECTED"
            ) {

                stopConnectionTimer(
                    "Connected"
                );

                qrImage.style.display =
                    "none";

                showToast(
                    "WhatsApp connected",
                    "success"
                );
            }
        }
    );

function startConnectionTimer() {

    connectionStartedAt =
        Date.now();

    updateConnectionTimer(
        "Connecting"
    );

    clearInterval(
        connectionTimerId
    );

    connectionTimerId =
        setInterval(
            () => {
                updateConnectionTimer(
                    "Connecting"
                );
            },
            1000
        );
}

function stopConnectionTimer(
    label
) {

    if (connectionTimerId) {

        clearInterval(
            connectionTimerId
        );

        connectionTimerId =
            null;
    }

    updateConnectionTimer(
        label
    );
}

function updateConnectionTimer(
    label
) {

    const elapsedMs =
        connectionStartedAt
            ? Date.now() - connectionStartedAt
            : 0;

    connectionTimer.innerText =
        `${label}: ${formatConnectionElapsed(elapsedMs)}`;
}

function formatConnectionElapsed(
    elapsedMs
) {

    const totalSeconds =
        Math.max(
            0,
            Math.floor(elapsedMs / 1000)
        );

    const minutes =
        Math.floor(totalSeconds / 60);

    const seconds =
        totalSeconds % 60;

    return [
        minutes,
        seconds
    ].map(value => {
        return String(value).padStart(2, "0");
    }).join(":");
}

function setConnectionStatus(
    text
) {

    const nextText =
        text ||
        "Not connected";

    connectionStatus.innerText =
        nextText;

    connectionTile.classList.remove(
        ...connectionStateClasses
    );

    const connectionState =
        getConnectionState(nextText);

    connectionTile.classList.add(
        `connection-${connectionState}`
    );

    isWhatsAppConnected =
        connectionState === "connected";

    updateConnectButton();
}

function updateConnectButton() {

    if (isWhatsAppConnected) {

        connectBtn.innerText =
            "WhatsApp Connected";

        connectBtn.disabled =
            true;

        return;
    }

    if (isWhatsAppConnecting) {

        connectBtn.innerText =
            "Connecting...";

        connectBtn.disabled =
            true;

        return;
    }

    connectBtn.innerText =
        "Connect WhatsApp";

    connectBtn.disabled =
        unsafeControlsDisabled;
}

function getConnectionState(
    text
) {

    const normalized =
        String(text)
            .toLowerCase();

    if (
        normalized.includes("not connected") ||
        normalized.includes("not_connected") ||
        normalized.includes("notconnected") ||
        normalized.includes("not logged")
    ) {

        return "waiting";
    }

    if (
        normalized.includes("failed") ||
        normalized.includes("error") ||
        normalized.includes("disconnect") ||
        normalized.includes("closed") ||
        normalized.includes("timeout")
    ) {

        return "error";
    }

    if (
        normalized.includes("connecting") ||
        normalized.includes("qr") ||
        normalized.includes("scan") ||
        normalized.includes("loading") ||
        normalized.includes("starting")
    ) {

        return "connecting";
    }

    if (
        normalized === "connected" ||
        normalized.includes(" connected") ||
        normalized.includes("inchat") ||
        normalized.includes("islogged")
    ) {

        return "connected";
    }

    return "waiting";
}

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

openSuccessLogsBtn.addEventListener(
    "click",
    async () => {

        await openLogFolder(
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

cleanAllLogsBtn.addEventListener(
    "click",
    async () => {

        await cleanAllLogFiles();
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

        resetValidationWarningDisplay();

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

async function cleanAllLogFiles() {

    const confirmed =
        window.confirm(
            "Delete all saved success, failed, retry, and send logs?"
        );

    if (!confirmed) {

        return;
    }

    const logKinds = [
        {
            kind: "success",
            label: "success"
        },
        {
            kind: "failed",
            label: "failed"
        },
        {
            kind: "failedRetry",
            label: "retry"
        },
        {
            kind: "send",
            label: "send"
        }
    ];

    let deletedCount = 0;

    const failedLabels = [];

    for (const logKind of logKinds) {

        const result =
            await window.electronAPI
                .cleanLogFiles(logKind.kind);

        if (result.success) {

            deletedCount +=
                result.deletedCount || 0;

        } else {

            failedLabels.push(
                logKind.label
            );
        }
    }

    if (failedLabels.length > 0) {

        showToast(
            `Could not clean ${failedLabels.join(", ")} logs`,
            "error"
        );

        if (deletedCount === 0) {

            return;
        }
    }

    showToast(
        `Deleted ${deletedCount} log file(s)`,
        "success"
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

                    provider:
                        getSelectedProvider(),
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

                    provider:
                        getSelectedProvider(),
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
                provider:
                    getSelectedProvider(),
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

    currentValidationResult =
        result;

    const warnings =
        result.warnings || [];

    const summary =
        result.summary || {
            provider:
                getSelectedProvider(),
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

    const recipientLabel =
        summary.provider === "telegram"
            ? "recipients"
            : "phones";

    const validRecipients =
        summary.validRecipients ??
        summary.validPhones;

    const invalidRecipients =
        summary.invalidRecipients ??
        summary.invalidPhones;

    const duplicateRecipients =
        summary.duplicateRecipients ??
        summary.duplicatePhones;

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
        `${summary.totalContacts} contacts, ${validRecipients} valid ${recipientLabel}, ${invalidRecipients} invalid, ${duplicateRecipients} duplicate`;

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

            const visibleDetails =
                validationWarningsExpanded
                    ? warning.details
                    : warning.details.slice(
                        0,
                        validationWarningPreviewLimit
                    );

            visibleDetails.forEach(detail => {

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

    if (hasHiddenValidationWarnings(warnings)) {

        const toggleItem =
            document.createElement("li");

        toggleItem.className =
            "validation-toggle-item";

        const toggleButton =
            document.createElement("button");

        toggleButton.type =
            "button";

        toggleButton.className =
            "validation-toggle";

        toggleButton.innerText =
            validationWarningsExpanded
                ? "Show fewer warnings"
                : `Show all warnings (${getExpandableWarningCount(warnings)})`;

        toggleButton.addEventListener(
            "click",
            () => {

                validationWarningsExpanded =
                    !validationWarningsExpanded;

                renderValidationWarnings(
                    currentValidationResult
                );
            }
        );

        toggleItem.appendChild(
            toggleButton
        );

        validationWarnings.appendChild(
            toggleItem
        );
    }
}

function resetValidationWarningDisplay() {

    validationWarningsExpanded =
        false;
}

function hasHiddenValidationWarnings(
    warnings
) {

    return warnings.some(warning => {

        return (
            warning.details &&
            warning.details.length >
                validationWarningPreviewLimit
        );
    });
}

function getExpandableWarningCount(
    warnings
) {

    return warnings.reduce(
        (total, warning) => {

            if (
                warning.details &&
                warning.details.length >
                    validationWarningPreviewLimit
            ) {

                return total +
                    warning.details.length;
            }

            return total;
        },
        0
    );
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
        broadcastStatusLabels[status] ||
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

    unsafeControlsDisabled =
        disabled;

    [
        addContactsFileBtn,
        previewBtn,
        mediaBtn,
        saveTemplateBtn,
        openSuccessLogsBtn,
        openFailedLogsBtn,
        cleanAllLogsBtn
    ].forEach(button => {

        button.disabled =
            disabled;
    });

    updateConnectButton();

    templateInput.disabled =
        disabled;

    providerSelect.disabled =
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
setConnectionStatus("Not connected");
setBroadcastStatus("IDLE");
updateButtons("IDLE");
