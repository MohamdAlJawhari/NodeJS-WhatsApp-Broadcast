(function () {

    const activeSendStates = [
        "RUNNING",
        "PAUSED",
        "STOPPING"
    ];

    function createContactFilesUI({
        getBroadcastState,
        refreshValidationWarnings,
        setContacts,
        setStatusText,
        showToast
    }) {

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

        let selectedContactFileId = null;
        let editorFile = null;
        let editorRows = [];
        let controlsDisabled = false;

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

                    setContacts([]);

                    setStatusText(
                        "No file selected"
                    );

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
                    isSendActive();

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
                    isSendActive();

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

            setContacts(
                result.contacts
            );

            selectedContactFileId =
                id;

            setStatusText(
                `Loaded ${result.count} saved contacts`
            );

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
                    controlsDisabled ||
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

                    input.disabled =
                        controlsDisabled;

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
            setUnsafeControlsDisabled(
                controlsDisabled
            );
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
                controlsDisabled ||
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

            addBtn.disabled =
                controlsDisabled;

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

                    setContacts(
                        loaded.contacts
                    );

                    setStatusText(
                        `Loaded ${loaded.count} saved contacts`
                    );

                    await refreshValidationWarnings();
                }
            }

            showToast(
                "File content saved",
                "success"
            );

            await loadSavedContactFiles();
        }

        function isSendActive() {

            return activeSendStates.includes(
                getBroadcastState()
            );
        }

        function setUnsafeControlsDisabled(
            disabled
        ) {

            controlsDisabled =
                disabled;

            [
                refreshSavedContactsBtn,
                openSavedContactsBtn,
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

        function clearSelectedContactFile() {

            selectedContactFileId =
                null;
        }

        return {
            clearSelectedContactFile,
            loadSavedContactFiles,
            setUnsafeControlsDisabled
        };
    }

    window.createContactFilesUI =
        createContactFilesUI;
})();
