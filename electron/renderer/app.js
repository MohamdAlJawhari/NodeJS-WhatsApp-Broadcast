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

const savedContactsList =
    document.getElementById(
        "savedContactsList"
    );

const refreshSavedContactsBtn =
    document.getElementById(
        "refreshSavedContactsBtn"
    );

const openSavedContactsBtn =
    document.getElementById(
        "openSavedContactsBtn"
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

const mainPage =
    document.getElementById(
        "mainPage"
    );

const contactEditorPage =
    document.getElementById(
        "contactEditorPage"
    );

const editorBackBtn =
    document.getElementById(
        "editorBackBtn"
    );

const editorSelectBtn =
    document.getElementById(
        "editorSelectBtn"
    );

const editorExportBtn =
    document.getElementById(
        "editorExportBtn"
    );

const editorDeleteBtn =
    document.getElementById(
        "editorDeleteBtn"
    );

const editorFileMeta =
    document.getElementById(
        "editorFileMeta"
    );

const editorFileNameInput =
    document.getElementById(
        "editorFileNameInput"
    );

const editorDescriptionInput =
    document.getElementById(
        "editorDescriptionInput"
    );

const editorSaveDetailsBtn =
    document.getElementById(
        "editorSaveDetailsBtn"
    );

const editorTableSummary =
    document.getElementById(
        "editorTableSummary"
    );

const editorSaveContentBtn =
    document.getElementById(
        "editorSaveContentBtn"
    );

const editorAddRowBtn =
    document.getElementById(
        "editorAddRowBtn"
    );

const editorAddColumnBtn =
    document.getElementById(
        "editorAddColumnBtn"
    );

const contactTableEditor =
    document.getElementById(
        "contactTableEditor"
    );

let contacts = [];

let mediaFile = null;

let selectedContactFileId = null;

let editorFile = null;

let editorRows = [];

let currentBroadcastState = "IDLE";

let stopRequested = false;

let broadcastStarting = false;

let validationRequestId = 0;

let validationTimer = null;

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

        await loadSavedContactFiles();

        await refreshValidationWarnings();
    }
);

refreshSavedContactsBtn.addEventListener(
    "click",
    async () => {

        await loadSavedContactFiles();
    }
);

openSavedContactsBtn.addEventListener(
    "click",
    async () => {

        const result =
            await window.electronAPI
                .openSavedContactsFolder();

        if (!result.success) {

            showToast(
                result.error ||
                "Could not open saved contacts folder",
                "error"
            );

            return;
        }

        showToast(
            "Saved contacts folder opened",
            "success"
        );
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

editorBackBtn.addEventListener(
    "click",
    async () => {

        showMainPage();

        await loadSavedContactFiles();
    }
);

editorSelectBtn.addEventListener(
    "click",
    async () => {

        if (!editorFile) {

            return;
        }

        await selectSavedContactFile(
            editorFile.id
        );

        showMainPage();
    }
);

editorExportBtn.addEventListener(
    "click",
    async () => {

        if (!editorFile) {

            return;
        }

        const result =
            await window.electronAPI
                .exportSavedContactFile(
                    editorFile.id
                );

        if (!result.success) {

            if (result.error) {

                showToast(
                    result.error,
                    "error"
                );
            }

            return;
        }

        showToast(
            "Contact file exported",
            "success"
        );
    }
);

editorDeleteBtn.addEventListener(
    "click",
    async () => {

        if (!editorFile) {

            return;
        }

        const confirmed =
            window.confirm(
                `Delete ${editorFile.fileName}?`
            );

        if (!confirmed) {

            return;
        }

        const result =
            await window.electronAPI
                .deleteSavedContactFile(
                    editorFile.id
                );

        if (!result.success) {

            showToast(
                result.error ||
                "Could not delete contact file",
                "error"
            );

            return;
        }

        if (
            selectedContactFileId ===
            editorFile.id
        ) {

            selectedContactFileId =
                null;

            contacts = [];

            status.innerText =
                "No file selected";

            await refreshValidationWarnings();
        }

        showToast(
            "Contact file deleted",
            "success"
        );

        editorFile =
            null;

        editorRows =
            [];

        showMainPage();

        await loadSavedContactFiles();
    }
);

editorSaveDetailsBtn.addEventListener(
    "click",
    async () => {

        await saveEditorDetails();
    }
);

editorSaveContentBtn.addEventListener(
    "click",
    async () => {

        await saveEditorContent();
    }
);

editorAddRowBtn.addEventListener(
    "click",
    () => {

        insertEditorRow(
            editorRows.length
        );
    }
);

editorAddColumnBtn.addEventListener(
    "click",
    () => {

        insertEditorColumn(
            editorRows[0]?.length || 0
        );
    }
);

async function loadSavedContactFiles() {

    const result =
        await window.electronAPI
            .listSavedContactFiles();

    if (!result.success) {

        savedContactsList.innerText =
            "Could not load saved contacts";

        showToast(
            result.error ||
            "Could not load saved contacts",
            "error"
        );

        return;
    }

    renderSavedContactFiles(
        result.files || []
    );
}

function renderSavedContactFiles(
    files
) {

    savedContactsList.innerHTML =
        "";

    if (files.length === 0) {

        savedContactsList.className =
            "saved-contacts-empty";

        savedContactsList.innerText =
            "No saved contact files";

        return;
    }

    savedContactsList.className =
        "";

    files.forEach(file => {

        const item =
            document.createElement("div");

        item.className =
            "saved-contact-item";

        const info =
            document.createElement("div");

        info.className =
            "saved-contact-info";

        const name =
            document.createElement("strong");

        name.innerText =
            file.displayName ||
            file.fileName;

        const meta =
            document.createElement("span");

        meta.innerText =
            getSavedContactMeta(file);

        info.appendChild(name);
        info.appendChild(meta);

        const actions =
            document.createElement("div");

        actions.className =
            "saved-contact-actions";

        const button =
            document.createElement("button");

        button.innerText =
            "Select";

        button.dataset.hasError =
            file.loadError ? "true" : "false";

        button.disabled =
            Boolean(file.loadError) ||
            [
                "RUNNING",
                "PAUSED",
                "STOPPING"
            ].includes(currentBroadcastState);

        button.addEventListener(
            "click",
            async () => {
                await selectSavedContactFile(
                    file.id
                );
            }
        );

        const editButton =
            document.createElement("button");

        editButton.innerText =
            "Edit";

        editButton.dataset.hasError =
            "false";

        editButton.disabled =
            [
                "RUNNING",
                "PAUSED",
                "STOPPING"
            ].includes(currentBroadcastState);

        editButton.addEventListener(
            "click",
            async () => {
                await openContactEditor(
                    file.id
                );
            }
        );

        actions.appendChild(button);
        actions.appendChild(editButton);

        item.appendChild(info);
        item.appendChild(actions);

        if (file.loadError) {

            const warning =
                document.createElement("p");

            warning.className =
                "saved-contact-warning";

            warning.innerText =
                file.loadError;

            info.appendChild(warning);
        }

        savedContactsList.appendChild(
            item
        );
    });
}

function getSavedContactMeta(
    file
) {

    const parts = [];

    if (file.count !== null) {

        parts.push(
            `${file.count} contacts`
        );
    }

    parts.push(
        formatBytes(file.size)
    );

    if (file.modifiedAt) {

        parts.push(
            new Date(file.modifiedAt)
                .toLocaleString()
        );
    }

    if (file.duplicateCount > 1) {

        parts.push(
            `${file.duplicateCount} saved copies`
        );
    }

    return parts.join(" | ");
}

function formatBytes(
    size
) {

    if (!Number.isFinite(size)) {

        return "Unknown size";
    }

    if (size < 1024) {

        return `${size} B`;
    }

    if (size < 1024 * 1024) {

        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function selectSavedContactFile(
    id
) {

    const result =
        await window.electronAPI
            .loadSavedContactFile(id);

    if (!result.success) {

        showToast(
            result.error ||
            "Could not load saved contacts",
            "error"
        );

        return;
    }

    contacts =
        result.contacts;

    selectedContactFileId =
        id;

    status.innerText =
        `Loaded ${result.count} saved contacts`;

    showToast(
        `Loaded ${result.count} saved contacts`,
        "success"
    );

    await refreshValidationWarnings();
}

function showMainPage() {

    mainPage.classList.remove(
        "hidden"
    );

    contactEditorPage.classList.add(
        "hidden"
    );
}

function showContactEditorPage() {

    mainPage.classList.add(
        "hidden"
    );

    contactEditorPage.classList.remove(
        "hidden"
    );
}

async function openContactEditor(
    id
) {

    const result =
        await window.electronAPI
            .getSavedContactDetails(id);

    if (!result.success) {

        showToast(
            result.error ||
            "Could not open contact editor",
            "error"
        );

        return;
    }

    setEditorFile(
        result.file
    );

    showContactEditorPage();
}

function setEditorFile(
    file
) {

    editorFile =
        file;

    editorRows =
        file.rows.map(row => {
            return [...row];
        });

    editorFileNameInput.value =
        file.fileName;

    editorDescriptionInput.value =
        file.description || "";

    renderEditorMeta();
    renderContactTableEditor();
}

function renderEditorMeta() {

    if (!editorFile) {

        editorFileMeta.innerText =
            "";

        editorTableSummary.innerText =
            "";

        return;
    }

    editorFileMeta.innerText =
        [
            `Stored file: ${editorFile.fileName}`,
            `Last modified: ${new Date(editorFile.modifiedAt).toLocaleString()}`,
            `Size: ${formatBytes(editorFile.size)}`
        ].join("\n");

    editorTableSummary.innerText =
        `Table rows: ${Math.max(0, editorRows.length - 1)}. Columns: ${editorRows[0]?.length || 0}.`;
}

function renderContactTableEditor() {

    contactTableEditor.innerHTML =
        "";

    const table =
        document.createElement("table");

    table.className =
        "contact-editor-table";

    const thead =
        document.createElement("thead");

    const controlsRow =
        document.createElement("tr");

    const rowControlHeader =
        document.createElement("th");

    rowControlHeader.innerText =
        "Row";

    controlsRow.appendChild(rowControlHeader);

    const headerRow =
        document.createElement("tr");

    const rowHeader =
        document.createElement("th");

    rowHeader.innerText =
        "";

    headerRow.appendChild(rowHeader);

    const phoneColumnIndex =
        getEditorPhoneColumnIndex();

    editorRows[0].forEach((header, columnIndex) => {

        const controlCell =
            document.createElement("th");

        controlCell.appendChild(
            createInlineControls(
                () => deleteEditorColumn(columnIndex),
                () => insertEditorColumn(columnIndex + 1),
                columnIndex === phoneColumnIndex
            )
        );

        controlsRow.appendChild(controlCell);

        const headerCell =
            document.createElement("th");

        const input =
            document.createElement("input");

        input.value =
            header;

        input.disabled =
            columnIndex === phoneColumnIndex;

        input.dataset.locked =
            columnIndex === phoneColumnIndex
                ? "true"
                : "false";

        input.addEventListener(
            "input",
            () => {
                editorRows[0][columnIndex] =
                    input.value;
            }
        );

        headerCell.appendChild(input);
        headerRow.appendChild(headerCell);
    });

    thead.appendChild(controlsRow);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody =
        document.createElement("tbody");

    editorRows.slice(1).forEach((row, rowIndex) => {

        const actualRowIndex =
            rowIndex + 1;

        const tr =
            document.createElement("tr");

        const controlsCell =
            document.createElement("td");

        controlsCell.appendChild(
            createInlineControls(
                () => deleteEditorRow(actualRowIndex),
                () => insertEditorRow(actualRowIndex + 1),
                false
            )
        );

        tr.appendChild(controlsCell);

        editorRows[0].forEach((_, columnIndex) => {

            const cell =
                document.createElement("td");

            const input =
                document.createElement("input");

            input.value =
                row[columnIndex] || "";

            input.addEventListener(
                "input",
                () => {
                    editorRows[actualRowIndex][columnIndex] =
                        input.value;
                }
            );

            cell.appendChild(input);
            tr.appendChild(cell);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    contactTableEditor.appendChild(table);

    renderEditorMeta();
}

function createInlineControls(
    onRemove,
    onAdd,
    removeDisabled
) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "inline-controls";

    const removeBtn =
        document.createElement("button");

    removeBtn.type =
        "button";

    removeBtn.className =
        "mini-btn mini-danger";

    removeBtn.innerText =
        "-";

    removeBtn.disabled =
        removeDisabled;

    removeBtn.dataset.locked =
        removeDisabled ? "true" : "false";

    removeBtn.addEventListener(
        "click",
        onRemove
    );

    const addBtn =
        document.createElement("button");

    addBtn.type =
        "button";

    addBtn.className =
        "mini-btn mini-success";

    addBtn.innerText =
        "+";

    addBtn.addEventListener(
        "click",
        onAdd
    );

    wrapper.appendChild(removeBtn);
    wrapper.appendChild(addBtn);

    return wrapper;
}

function getEditorPhoneColumnIndex() {

    const phoneColumn =
        editorFile?.phoneColumn || "phone";

    const index =
        editorRows[0]?.findIndex(header => {
            return String(header).trim().toLowerCase() ===
                phoneColumn.toLowerCase();
        });

    return index >= 0 ? index : -1;
}

function insertEditorRow(
    index
) {

    const width =
        editorRows[0]?.length || 1;

    editorRows.splice(
        index,
        0,
        Array(width).fill("")
    );

    renderContactTableEditor();
}

function deleteEditorRow(
    index
) {

    if (index <= 0) {

        return;
    }

    editorRows.splice(index, 1);

    renderContactTableEditor();
}

function insertEditorColumn(
    index
) {

    const name =
        createUniqueColumnName();

    editorRows.forEach((row, rowIndex) => {

        row.splice(
            index,
            0,
            rowIndex === 0 ? name : ""
        );
    });

    renderContactTableEditor();
}

function deleteEditorColumn(
    index
) {

    if (
        index === getEditorPhoneColumnIndex() ||
        editorRows[0].length <= 1
    ) {

        return;
    }

    editorRows.forEach(row => {
        row.splice(index, 1);
    });

    renderContactTableEditor();
}

function createUniqueColumnName() {

    const headers =
        new Set(
            editorRows[0].map(header => {
                return String(header).toLowerCase();
            })
        );

    let index = 1;

    while (
        headers.has(`column_${index}`)
    ) {

        index++;
    }

    return `column_${index}`;
}

async function saveEditorDetails() {

    if (!editorFile) {

        return;
    }

    const previousId =
        editorFile.id;

    const result =
        await window.electronAPI
            .saveSavedContactDetails({
                id: editorFile.id,
                fileName:
                    editorFileNameInput.value,
                description:
                    editorDescriptionInput.value
            });

    if (!result.success) {

        showToast(
            result.error ||
            "Could not save file details",
            "error"
        );

        return;
    }

    if (selectedContactFileId === previousId) {

        selectedContactFileId =
            result.file.id;
    }

    setEditorFile(
        result.file
    );

    showToast(
        "File details saved",
        "success"
    );

    await loadSavedContactFiles();
}

async function saveEditorContent() {

    if (!editorFile) {

        return;
    }

    const result =
        await window.electronAPI
            .saveSavedContactContent({
                id: editorFile.id,
                rows: editorRows
            });

    if (!result.success) {

        showToast(
            result.error ||
            "Could not save file content",
            "error"
        );

        return;
    }

    setEditorFile(
        result.file
    );

    if (
        selectedContactFileId ===
        editorFile.id
    ) {

        const loaded =
            await window.electronAPI
                .loadSavedContactFile(
                    editorFile.id
                );

        if (loaded.success) {

            contacts =
                loaded.contacts;

            status.innerText =
                `Loaded ${loaded.count} saved contacts`;

            await refreshValidationWarnings();
        }
    }

    showToast(
        "File content saved",
        "success"
    );

    await loadSavedContactFiles();
}

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

    await loadSavedContactFiles();

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
        refreshSavedContactsBtn,
        openSavedContactsBtn,
        connectBtn,
        previewBtn,
        mediaBtn,
        saveTemplateBtn,
        openSuccessLogsBtn,
        cleanSuccessLogsBtn,
        openFailedLogsBtn,
        cleanFailedLogsBtn,
        cleanSendLogsBtn,
        editorSelectBtn,
        editorExportBtn,
        editorDeleteBtn,
        editorSaveDetailsBtn,
        editorSaveContentBtn,
        editorAddRowBtn,
        editorAddColumnBtn
    ].forEach(button => {

        button.disabled =
            disabled;
    });

    templateInput.disabled =
        disabled;

    editorFileNameInput.disabled =
        disabled;

    editorDescriptionInput.disabled =
        disabled;

    contactTableEditor
        .querySelectorAll("input, button")
        .forEach(control => {

            control.disabled =
                disabled ||
                control.dataset.locked === "true";
        });

    savedContactsList
        .querySelectorAll("button")
        .forEach(button => {

            button.disabled =
                disabled ||
                button.dataset.hasError === "true";
        });
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
