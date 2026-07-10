(function () {

    const activeSendStates = [
        "RUNNING",
        "PAUSED",
        "STOPPING"
    ];

    const contactCategoryStorageKey =
        "broadcast-sender.contact-file-categories.v1";

    function createContactFilesUI({
        getBroadcastState,
        refreshValidationWarnings,
        setContacts,
        setStatusText,
        showContactsPage,
        showEditorPage,
        showSenderPage,
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

        const editorSearchInput =
            document.getElementById(
                "editorSearchInput"
            );

        const editorClearSearchBtn =
            document.getElementById(
                "editorClearSearchBtn"
            );

        const editorUI = {
            activeBadge: document.getElementById("editorActiveBadge"),
            allCount: document.getElementById("editorAllCount"),
            deleteSelected: document.getElementById("editorDeleteSelectedBtn"),
            displayFileName: document.getElementById("editorDisplayFileName"),
            duplicateCount: document.getElementById("editorDuplicateCount"),
            duplicateSelected: document.getElementById("editorDuplicateSelectedBtn"),
            fileMenu: document.getElementById("editorFileMenu"),
            invalidCount: document.getElementById("editorInvalidCount"),
            moreButton: document.getElementById("editorMoreBtn"),
            readyCard: document.getElementById("editorReadyCard"),
            redo: document.getElementById("editorRedoBtn"),
            sideDuplicates: document.getElementById("editorSideDuplicates"),
            sideInvalid: document.getElementById("editorSideInvalid"),
            sideTotal: document.getElementById("editorSideTotal"),
            sideValid: document.getElementById("editorSideValid"),
            undo: document.getElementById("editorUndoBtn"),
            validCount: document.getElementById("editorValidCount"),
            validationResults: document.getElementById("editorValidationResults")
        };

        const contactTableEditor =
            document.getElementById(
                "contactTableEditor"
            );

        let selectedContactFileId = null;
        let editorFile = null;
        let editorRows = [];
        let editorSearchQuery = "";
        let controlsDisabled = false;
        let selectedEditorRows = new Set();
        let editorHistory = [];
        let editorFuture = [];
        let editorStatFilter = "all";

        const editorIconPaths = {
            "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
            "arrow-up-down": '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
            "badge-check": '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
            "check": '<path d="m20 6-11 11-5-5"/>',
            "chevron-left": '<path d="m15 18-6-6 6-6"/>',
            "chevron-right": '<path d="m9 18 6-6-6-6"/>',
            "circle-check": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
            "columns": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
            "copy": '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
            "copy-x": '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/><path d="m13 13 4 4m0-4-4 4"/>',
            "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
            "filter": '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/>',
            "file-spreadsheet": '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2m4 0h2M8 17h2m4 0h2"/>',
            "more-horizontal": '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
            "pencil": '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
            "phone": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z"/>',
            "plus": '<path d="M12 5v14M5 12h14"/>',
            "redo": '<path d="m15 14 5-5-5-5"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
            "rows-3": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18"/>',
            "save": '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
            "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
            "send": '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
            "trash": '<path d="M3 6h18M8 6V4h8v2m2 0-1 15H7L6 6M10 11v6m4-6v6"/>',
            "undo": '<path d="m9 14-5-5 5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
            "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
            "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m3-3h-6"/>',
            "x": '<path d="M18 6 6 18M6 6l12 12"/>'
        };

        function createEditorIcon(name) {
            const wrapper = document.createElement("span");
            wrapper.className = "editor-lucide-icon";
            wrapper.setAttribute("aria-hidden", "true");
            wrapper.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${editorIconPaths[name] || editorIconPaths.check}</svg>`;
            return wrapper;
        }

        function hydrateEditorIcons(root = document) {
            root.querySelectorAll("[data-editor-icon], [data-editor-icon-only]").forEach(element => {
                if (element.dataset.editorIconReady === "true") return;
                const name = element.dataset.editorIcon || element.dataset.editorIconOnly;
                element.prepend(createEditorIcon(name));
                element.dataset.editorIconReady = "true";
            });
        }

        hydrateEditorIcons(document.getElementById("contactEditorPage"));

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

                await showContactsPage();
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

                await showSenderPage();
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

                removePersistedContactCategory(
                    editorFile.id
                );

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

                    updateSelectedContactDisplay({
                        count: 0,
                        filePath: null,
                        statusText:
                            "No file selected"
                    });

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

                await showContactsPage();
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

                recordEditorHistory();

                insertEditorRow(
                    editorRows.length
                );
            }
        );

        editorAddColumnBtn.addEventListener(
            "click",
            () => {

                recordEditorHistory();

                insertEditorColumn(
                    editorRows[0]?.length || 0
                );
            }
        );

        editorSearchInput.addEventListener(
            "input",
            () => {

                editorSearchQuery =
                    editorSearchInput.value;

                renderContactTableEditor();
            }
        );

        editorClearSearchBtn.addEventListener(
            "click",
            () => {

                editorSearchQuery =
                    "";

                editorSearchInput.value =
                    "";

                renderContactTableEditor();

                editorSearchInput.focus();
            }
        );

        editorUI.moreButton.addEventListener("click", event => {
            event.stopPropagation();
            const opening = editorUI.fileMenu.classList.contains("hidden");
            editorUI.fileMenu.classList.toggle("hidden", !opening);
            editorUI.moreButton.setAttribute("aria-expanded", String(opening));
        });

        document.addEventListener("click", event => {
            if (!event.target.closest(".editor-menu-wrap")) {
                closeEditorFileMenu();
            }
        });

        document.getElementById("editorRenameBtn").addEventListener("click", () => {
            closeEditorFileMenu();
            editorFileNameInput.focus();
            editorFileNameInput.select();
        });

        document.getElementById("editorDuplicateFileBtn").addEventListener("click", async () => {
            closeEditorFileMenu();
            editorExportBtn.click();
            showToast("A copy is ready to save with a new name", "success");
        });

        document.getElementById("editorToolbarExportBtn").addEventListener("click", () => editorExportBtn.click());
        document.getElementById("editorImportBtn").addEventListener("click", () => document.getElementById("contactsAddFileBtn")?.click());

        editorUI.duplicateSelected.addEventListener("click", duplicateSelectedEditorRows);
        editorUI.deleteSelected.addEventListener("click", deleteSelectedEditorRows);
        editorUI.undo.addEventListener("click", undoEditorChange);
        editorUI.redo.addEventListener("click", redoEditorChange);

        document.querySelectorAll("[data-editor-stat]").forEach(button => {
            button.addEventListener("click", () => {
                editorStatFilter = button.dataset.editorStat;
                document.querySelectorAll("[data-editor-stat]").forEach(item => item.classList.toggle("is-active", item === button));
                renderContactTableEditor();
            });
        });

        document.getElementById("editorFilterBtn").addEventListener("click", () => {
            document.querySelector('[data-editor-stat="invalid"]')?.click();
        });

        document.getElementById("editorSortBtn").addEventListener("click", () => {
            if (editorRows.length < 3) return;
            recordEditorHistory();
            const phoneIndex = getEditorPhoneColumnIndex();
            const header = editorRows[0];
            const rows = editorRows.slice(1).sort((a, b) => String(a[phoneIndex] || "").localeCompare(String(b[phoneIndex] || ""), undefined, { numeric: true }));
            editorRows = [header, ...rows];
            renderContactTableEditor();
        });

        document.querySelectorAll("[data-editor-quick]").forEach(button => {
            button.addEventListener("click", () => runEditorQuickAction(button.dataset.editorQuick));
        });

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

                const savedCategory =
                    getPersistedContactCategory(
                        file
                    );

                item.dataset.contactCategory =
                    savedCategory;

                const info =
                    document.createElement("div");

                info.className =
                    "saved-contact-info";

                const name =
                    document.createElement("strong");

                name.innerText =
                    file.displayName ||
                    file.fileName;

                const nameRow =
                    document.createElement("div");

                nameRow.className =
                    "saved-contact-name-row";

                const categoryBadge =
                    document.createElement("span");

                categoryBadge.className =
                    "saved-contact-category-badge";

                categoryBadge.innerText =
                    getContactCategoryLabel(
                        savedCategory
                    );

                nameRow.appendChild(name);
                nameRow.appendChild(categoryBadge);

                const meta =
                    document.createElement("span");

                meta.innerText =
                    getSavedContactMeta(file);

                info.appendChild(nameRow);
                info.appendChild(meta);

                const actions =
                    document.createElement("div");

                actions.className =
                    "saved-contact-actions";

                const categoryControl =
                    document.createElement("label");

                categoryControl.className =
                    "saved-contact-category-control";

                const categoryLabel =
                    document.createElement("span");

                categoryLabel.innerText =
                    "Category";

                const categorySelect =
                    document.createElement("select");

                categorySelect.setAttribute(
                    "aria-label",
                    `Category for ${file.displayName || file.fileName}`
                );

                [
                    ["none", "None"],
                    ["whatsapp", "WhatsApp"],
                    ["telegram", "Telegram"]
                ].forEach(([value, label]) => {
                    const option =
                        document.createElement("option");

                    option.value = value;
                    option.innerText = label;
                    categorySelect.appendChild(option);
                });

                categorySelect.value =
                    savedCategory;

                categorySelect.addEventListener(
                    "change",
                    async () => {
                        const nextCategory =
                            normalizeContactCategory(
                                categorySelect.value
                            );

                        applyContactCategoryAppearance({
                            category: nextCategory,
                            categoryBadge,
                            categorySelect,
                            item
                        });

                        persistContactCategory(
                            file.id,
                            nextCategory
                        );

                        categorySelect.disabled = true;

                        try {
                            if (
                                typeof window.electronAPI
                                    .setSavedContactCategory === "function"
                            ) {
                                const result =
                                    await window.electronAPI
                                        .setSavedContactCategory({
                                            id: file.id,
                                            category: nextCategory
                                        });

                                if (!result.success) {
                                    throw new Error(
                                        result.error ||
                                        "Metadata synchronization failed"
                                    );
                                }
                            }
                        } catch (error) {
                            console.warn(
                                "Contact category saved locally; metadata synchronization is unavailable:",
                                error
                            );
                        } finally {
                            categorySelect.disabled = false;
                        }

                        showToast(
                            `${getContactCategoryLabel(nextCategory)} category applied`,
                            "success"
                        );
                    }
                );

                categoryControl.appendChild(
                    categoryLabel
                );

                categoryControl.appendChild(
                    categorySelect
                );

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

                actions.appendChild(categoryControl);
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

        function getPersistedContactCategory(
            file
        ) {

            const categories =
                readPersistedContactCategories();

            if (
                file?.id &&
                Object.prototype.hasOwnProperty.call(
                    categories,
                    file.id
                )
            ) {
                return normalizeContactCategory(
                    categories[file.id]
                );
            }

            return normalizeContactCategory(
                file?.category
            );
        }

        function readPersistedContactCategories() {

            try {
                const parsed = JSON.parse(
                    window.localStorage.getItem(
                        contactCategoryStorageKey
                    ) || "{}"
                );

                return parsed &&
                    typeof parsed === "object"
                    ? parsed
                    : {};
            } catch {
                return {};
            }
        }

        function persistContactCategory(
            id,
            category
        ) {

            if (!id) return;

            const categories =
                readPersistedContactCategories();

            categories[id] =
                normalizeContactCategory(category);

            try {
                window.localStorage.setItem(
                    contactCategoryStorageKey,
                    JSON.stringify(categories)
                );
            } catch (error) {
                console.warn(
                    "Could not persist contact category locally:",
                    error
                );
            }
        }

        function movePersistedContactCategory(
            previousId,
            nextId
        ) {

            if (
                !previousId ||
                !nextId ||
                previousId === nextId
            ) {
                return;
            }

            const categories =
                readPersistedContactCategories();

            if (!Object.prototype.hasOwnProperty.call(
                categories,
                previousId
            )) {
                return;
            }

            categories[nextId] =
                categories[previousId];

            delete categories[previousId];

            try {
                window.localStorage.setItem(
                    contactCategoryStorageKey,
                    JSON.stringify(categories)
                );
            } catch (error) {
                console.warn(
                    "Could not move saved contact category:",
                    error
                );
            }
        }

        function removePersistedContactCategory(
            id
        ) {

            const categories =
                readPersistedContactCategories();

            delete categories[id];

            try {
                window.localStorage.setItem(
                    contactCategoryStorageKey,
                    JSON.stringify(categories)
                );
            } catch {
                // Metadata cleanup is best-effort only.
            }
        }

        function applyContactCategoryAppearance({
            category,
            categoryBadge,
            categorySelect,
            item
        }) {

            const normalized =
                normalizeContactCategory(category);

            item.dataset.contactCategory =
                normalized;

            categorySelect.value =
                normalized;

            categoryBadge.innerText =
                getContactCategoryLabel(normalized);
        }

        function normalizeContactCategory(
            category
        ) {

            const normalized =
                String(category || "")
                    .trim()
                    .toLowerCase();

            return [
                "whatsapp",
                "telegram"
            ].includes(normalized)
                ? normalized
                : "none";
        }

        function getContactCategoryLabel(
            category
        ) {

            const normalized =
                normalizeContactCategory(category);

            if (normalized === "whatsapp") {
                return "WhatsApp";
            }

            if (normalized === "telegram") {
                return "Telegram";
            }

            return "None";
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

            updateSelectedContactDisplay({
                count:
                    result.count,
                filePath:
                    result.filePath,
                statusText:
                    `Loaded ${result.count} saved contacts`
            });

            showToast(
                `Loaded ${result.count} saved contacts`,
                "success"
            );

            await refreshValidationWarnings();
        }

        function showContactEditorPage() {

            showEditorPage();
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

            const isNewEditorFile =
                editorFile?.id !== file.id;

            editorFile =
                file;

            editorRows =
                file.rows.map(row => {
                    return [...row];
                });

            if (isNewEditorFile) {

                editorSearchQuery =
                    "";

                editorSearchInput.value =
                    "";

                selectedEditorRows.clear();
                editorHistory = [];
                editorFuture = [];
                editorStatFilter = "all";
            }

            editorFileNameInput.value =
                file.fileName;

            editorDescriptionInput.value =
                file.description || "";

            renderContactTableEditor();
        }

        function renderEditorMeta(
            matchingRowIndexes = getMatchingEditorRowIndexes()
        ) {

            if (!editorFile) {

                editorFileMeta.innerText =
                    "";

                editorTableSummary.innerText =
                    "";

                return;
            }

            editorUI.displayFileName.innerText = editorFile.displayName || editorFile.fileName;
            editorUI.activeBadge.classList.toggle("hidden", selectedContactFileId !== editorFile.id);
            editorFileMeta.innerHTML = "";
            [
                `${Math.max(0, editorRows.length - 1)} Contacts`,
                `${editorRows[0]?.length || 0} Columns`,
                formatBytes(editorFile.size),
                `Modified ${formatRelativeTime(editorFile.modifiedAt)}`
            ].forEach(text => {
                const chip = document.createElement("span");
                chip.innerText = text;
                editorFileMeta.appendChild(chip);
            });

            editorTableSummary.innerText =
                getEditorTableSummary(matchingRowIndexes);
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

            const headerRow =
                document.createElement("tr");

            const rowHeader =
                document.createElement("th");

            rowHeader.className = "editor-select-cell";
            const selectAll = document.createElement("input");
            selectAll.type = "checkbox";
            selectAll.setAttribute("aria-label", "Select all visible contacts");
            rowHeader.appendChild(selectAll);

            headerRow.appendChild(rowHeader);

            const numberHeader = document.createElement("th");
            numberHeader.className = "editor-row-number";
            numberHeader.innerText = "#";
            headerRow.appendChild(numberHeader);

            const phoneColumnIndex =
                getEditorPhoneColumnIndex();

            editorRows[0].forEach((header, columnIndex) => {

                const headerCell =
                    document.createElement("th");

                headerCell.className = "editor-column-heading";

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

                if (columnIndex !== phoneColumnIndex) {
                    const removeColumn = document.createElement("button");
                    removeColumn.type = "button";
                    removeColumn.className = "editor-column-remove";
                    removeColumn.appendChild(createEditorIcon("x"));
                    removeColumn.title = `Delete ${header || "column"}`;
                    removeColumn.disabled = controlsDisabled;
                    removeColumn.addEventListener("click", () => {
                        recordEditorHistory();
                        deleteEditorColumn(columnIndex);
                    });
                    headerCell.appendChild(removeColumn);
                }
                headerRow.appendChild(headerCell);
            });

            const actionsHeader = document.createElement("th");
            actionsHeader.className = "editor-actions-column";
            actionsHeader.innerText = "Actions";
            headerRow.appendChild(actionsHeader);
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody =
                document.createElement("tbody");

            const matchingRowIndexes =
                getMatchingEditorRowIndexes();

            matchingRowIndexes.forEach(actualRowIndex => {

                const row =
                    editorRows[actualRowIndex];

                const tr =
                    document.createElement("tr");

                tr.dataset.rowIndex = String(actualRowIndex);

                const controlsCell =
                    document.createElement("td");

                controlsCell.className = "editor-select-cell";
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = selectedEditorRows.has(actualRowIndex);
                checkbox.setAttribute("aria-label", `Select contact ${actualRowIndex}`);
                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) selectedEditorRows.add(actualRowIndex);
                    else selectedEditorRows.delete(actualRowIndex);
                    updateEditorSelectionControls();
                });
                controlsCell.appendChild(checkbox);

                tr.appendChild(controlsCell);

                const rowNumber = document.createElement("td");
                rowNumber.className = "editor-row-number";
                rowNumber.innerText = String(actualRowIndex);
                tr.appendChild(rowNumber);

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
                            renderEditorInsights();
                        }
                    );

                    cell.appendChild(input);
                    tr.appendChild(cell);
                });

                const actionsCell = document.createElement("td");
                actionsCell.className = "editor-row-actions";
                const actionWrap = document.createElement("div");
                [["Edit", () => tr.querySelector("td input:not([type=checkbox])")?.focus()], ["Duplicate", () => { recordEditorHistory(); insertEditorRow(actualRowIndex + 1, row); }], ["Delete", () => { recordEditorHistory(); deleteEditorRow(actualRowIndex); }]].forEach(([label, handler]) => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.innerText = label;
                    button.className = label === "Delete" ? "is-danger" : "";
                    button.prepend(createEditorIcon(label === "Edit" ? "pencil" : label === "Duplicate" ? "copy" : "trash"));
                    button.disabled = controlsDisabled;
                    button.addEventListener("click", handler);
                    actionWrap.appendChild(button);
                });
                actionsCell.appendChild(actionWrap);
                tr.appendChild(actionsCell);

                tbody.appendChild(tr);
            });

            selectAll.checked = matchingRowIndexes.length > 0 && matchingRowIndexes.every(index => selectedEditorRows.has(index));
            selectAll.addEventListener("change", () => {
                matchingRowIndexes.forEach(index => selectAll.checked ? selectedEditorRows.add(index) : selectedEditorRows.delete(index));
                renderContactTableEditor();
            });

            table.appendChild(tbody);
            contactTableEditor.appendChild(table);

            renderEditorMeta(
                matchingRowIndexes
            );

            editorClearSearchBtn.disabled =
                !editorSearchQuery.trim();

            setUnsafeControlsDisabled(
                controlsDisabled
            );

            updateEditorSelectionControls();
            renderEditorInsights();
        }

        function getMatchingEditorRowIndexes() {

            const indexes = [];
            const query =
                editorSearchQuery.trim().toLowerCase();
            const queryDigits =
                editorSearchQuery.replace(/\D/g, "");

            editorRows.slice(1).forEach((row, rowIndex) => {

                const actualIndex = rowIndex + 1;
                const rowState = getEditorRowState(row, actualIndex);

                if (
                    (editorStatFilter === "all" || rowState[editorStatFilter]) &&
                    (!query ||
                    rowMatchesEditorSearch(
                        row,
                        query,
                        queryDigits
                    ))
                ) {

                    indexes.push(rowIndex + 1);
                }
            });

            return indexes;
        }

        function rowMatchesEditorSearch(
            row,
            query,
            queryDigits
        ) {

            return row.some(value => {

                const text =
                    String(value || "");
                const normalizedText =
                    text.toLowerCase();

                if (normalizedText.includes(query)) {

                    return true;
                }

                if (!queryDigits) {

                    return false;
                }

                return text
                    .replace(/\D/g, "")
                    .includes(queryDigits);
            });
        }

        function getEditorTableSummary(
            matchingRowIndexes
        ) {

            const totalRows =
                Math.max(0, editorRows.length - 1);
            const columnCount =
                editorRows[0]?.length || 0;

            return `Showing ${matchingRowIndexes.length} of ${totalRows} contacts. Columns: ${columnCount}.`;
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
            index,
            sourceRow = null
        ) {

            const width =
                editorRows[0]?.length || 1;

            editorRows.splice(
                index,
                0,
                sourceRow ? [...sourceRow] : Array(width).fill("")
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

            movePersistedContactCategory(
                previousId,
                result.file.id
            );

            setEditorFile(
                result.file
            );

            showToast(
                "File details saved",
                "success"
            );

            updateEditorAutoSaveStatus();

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

                    updateSelectedContactDisplay({
                        count:
                            loaded.count,
                        filePath:
                            loaded.filePath,
                        statusText:
                            `Loaded ${loaded.count} saved contacts`
                    });

                    await refreshValidationWarnings();
                }
            }

            showToast(
                "File content saved",
                "success"
            );

            editorHistory = [];
            editorFuture = [];
            updateEditorHistoryControls();
            updateEditorAutoSaveStatus();

            await loadSavedContactFiles();
        }

        function closeEditorFileMenu() {
            editorUI.fileMenu.classList.add("hidden");
            editorUI.moreButton.setAttribute("aria-expanded", "false");
        }

        function updateEditorAutoSaveStatus() {
            const status = document.getElementById("statusBarAutoSave");
            if (status) status.innerText = "Auto Saved just now";
        }

        function formatRelativeTime(value) {
            const elapsed = Date.now() - new Date(value).getTime();
            if (!Number.isFinite(elapsed) || elapsed < 0) return "recently";
            const minutes = Math.floor(elapsed / 60000);
            if (minutes < 1) return "just now";
            if (minutes < 60) return `${minutes} min ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
            const days = Math.floor(hours / 24);
            return `${days} day${days === 1 ? "" : "s"} ago`;
        }

        function normalizePhoneValue(value) {
            const text = String(value || "").trim();
            const prefix = text.startsWith("+") ? "+" : "";
            return prefix + text.replace(/\D/g, "");
        }

        function getEditorInsights() {
            const phoneIndex = getEditorPhoneColumnIndex();
            const seen = new Map();
            const duplicateIndexes = new Set();
            let valid = 0;
            let invalid = 0;

            editorRows.slice(1).forEach((row, offset) => {
                const index = offset + 1;
                const phone = normalizePhoneValue(row[phoneIndex]);
                const digits = phone.replace(/\D/g, "");
                if (digits.length >= 7 && digits.length <= 15) valid++;
                else invalid++;
                if (digits) {
                    if (seen.has(digits)) {
                        duplicateIndexes.add(index);
                        duplicateIndexes.add(seen.get(digits));
                    } else seen.set(digits, index);
                }
            });

            return { duplicateIndexes, duplicates: duplicateIndexes.size, invalid, total: Math.max(0, editorRows.length - 1), valid };
        }

        function getEditorRowState(row, index) {
            const insights = getEditorInsights();
            const phone = normalizePhoneValue(row[getEditorPhoneColumnIndex()]);
            const valid = phone.replace(/\D/g, "").length >= 7 && phone.replace(/\D/g, "").length <= 15;
            return { valid, invalid: !valid, duplicate: insights.duplicateIndexes.has(index) };
        }

        function renderEditorInsights() {
            if (!editorFile || !editorRows.length) return;
            const stats = getEditorInsights();
            editorUI.allCount.innerText = stats.total;
            editorUI.validCount.innerText = stats.valid;
            editorUI.duplicateCount.innerText = stats.duplicates;
            editorUI.invalidCount.innerText = stats.invalid;
            editorUI.sideTotal.innerText = stats.total;
            editorUI.sideValid.innerText = stats.valid;
            editorUI.sideDuplicates.innerText = stats.duplicates;
            editorUI.sideInvalid.innerText = stats.invalid;

            const phoneExists = getEditorPhoneColumnIndex() >= 0;
            editorUI.validationResults.innerHTML = "";
            [
                [stats.invalid === 0, stats.invalid === 0 ? "All phone numbers valid" : `${stats.invalid} invalid phone number${stats.invalid === 1 ? "" : "s"}`],
                [stats.duplicates === 0, stats.duplicates === 0 ? "No duplicate numbers" : `${stats.duplicates} duplicate contact${stats.duplicates === 1 ? "" : "s"}`],
                [phoneExists, phoneExists ? "Required phone column exists" : "Required phone column is missing"]
            ].forEach(([success, text]) => {
                const row = document.createElement("div");
                row.className = success ? "is-success" : "is-warning";
                const icon = document.createElement("span");
                icon.appendChild(createEditorIcon(success ? "check" : "circle-check"));
                const message = document.createElement("p");
                message.innerText = text;
                row.appendChild(icon);
                row.appendChild(message);
                editorUI.validationResults.appendChild(row);
            });
            editorUI.readyCard.classList.toggle("is-not-ready", stats.invalid > 0 || stats.duplicates > 0 || !phoneExists);
            editorUI.readyCard.querySelector("strong").innerText = stats.invalid === 0 && stats.duplicates === 0 && phoneExists ? "File Ready for Broadcast" : "File Needs Attention";
            editorUI.readyCard.querySelector("small").innerText = stats.invalid === 0 && stats.duplicates === 0 && phoneExists ? "All required checks passed" : "Resolve validation issues before sending";
        }

        function recordEditorHistory() {
            editorHistory.push(editorRows.map(row => [...row]));
            if (editorHistory.length > 30) editorHistory.shift();
            editorFuture = [];
            updateEditorHistoryControls();
        }

        function undoEditorChange() {
            if (!editorHistory.length) return;
            editorFuture.push(editorRows.map(row => [...row]));
            editorRows = editorHistory.pop();
            selectedEditorRows.clear();
            renderContactTableEditor();
        }

        function redoEditorChange() {
            if (!editorFuture.length) return;
            editorHistory.push(editorRows.map(row => [...row]));
            editorRows = editorFuture.pop();
            selectedEditorRows.clear();
            renderContactTableEditor();
        }

        function updateEditorHistoryControls() {
            editorUI.undo.disabled = controlsDisabled || editorHistory.length === 0;
            editorUI.redo.disabled = controlsDisabled || editorFuture.length === 0;
        }

        function updateEditorSelectionControls() {
            const hasSelection = selectedEditorRows.size > 0;
            editorUI.duplicateSelected.disabled = controlsDisabled || !hasSelection;
            editorUI.deleteSelected.disabled = controlsDisabled || !hasSelection;
            updateEditorHistoryControls();
        }

        function duplicateSelectedEditorRows() {
            if (!selectedEditorRows.size) return;
            recordEditorHistory();
            [...selectedEditorRows].sort((a, b) => a - b).forEach(index => editorRows.push([...editorRows[index]]));
            selectedEditorRows.clear();
            renderContactTableEditor();
            showToast("Selected contacts duplicated", "success");
        }

        function deleteSelectedEditorRows() {
            if (!selectedEditorRows.size) return;
            recordEditorHistory();
            [...selectedEditorRows].sort((a, b) => b - a).forEach(index => editorRows.splice(index, 1));
            selectedEditorRows.clear();
            renderContactTableEditor();
            showToast("Selected contacts removed", "success");
        }

        function runEditorQuickAction(action) {
            if (action === "validate") {
                renderEditorInsights();
                showToast("Validation complete", "success");
                return;
            }
            recordEditorHistory();
            const phoneIndex = getEditorPhoneColumnIndex();
            if (action === "duplicates") {
                const seen = new Set();
                editorRows = [editorRows[0], ...editorRows.slice(1).filter(row => {
                    const phone = normalizePhoneValue(row[phoneIndex]).replace(/\D/g, "");
                    if (phone && seen.has(phone)) return false;
                    if (phone) seen.add(phone);
                    return true;
                })];
            } else if (action === "empty") {
                editorRows = [editorRows[0], ...editorRows.slice(1).filter(row => row.some(value => String(value || "").trim()))];
            } else if (action === "normalize") {
                editorRows.slice(1).forEach(row => { row[phoneIndex] = normalizePhoneValue(row[phoneIndex]); });
            } else if (action === "usernames") {
                const usernameIndex = editorRows[0].findIndex(header => String(header).trim().toLowerCase() === "username");
                if (usernameIndex < 0) {
                    editorHistory.pop();
                    updateEditorHistoryControls();
                    showToast("Add a Username column first", "error");
                    return;
                }
                editorRows.slice(1).forEach((row, index) => { if (!String(row[usernameIndex] || "").trim()) row[usernameIndex] = `contact_${index + 1}`; });
            }
            selectedEditorRows.clear();
            renderContactTableEditor();
            showToast("Quick action applied — click Save to keep changes", "success");
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

            document.querySelectorAll(
                "[data-editor-quick], #editorDuplicateSelectedBtn, #editorDeleteSelectedBtn, #editorUndoBtn, #editorRedoBtn, #editorImportBtn, #editorToolbarExportBtn, #editorFilterBtn, #editorSortBtn"
            ).forEach(control => {
                control.disabled = disabled ||
                    ([editorUI.duplicateSelected, editorUI.deleteSelected].includes(control) && selectedEditorRows.size === 0);
            });

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

        function updateSelectedContactDisplay({
            count,
            filePath,
            statusText
        }) {

            const contactFileName =
                document.getElementById(
                    "contactFileName"
                );

            const contactsCount =
                document.getElementById(
                    "contactsCount"
                );

            const status =
                document.getElementById(
                    "status"
                );

            if (contactFileName) {

                contactFileName.innerText =
                    filePath
                        ? getFileName(filePath)
                        : "No Excel file loaded";
            }

            if (contactsCount) {

                contactsCount.innerText =
                    Number.isFinite(count)
                        ? `${count} contacts`
                        : "0 contacts";
            }

            if (
                status &&
                statusText
            ) {

                status.innerText =
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
            clearSelectedContactFile,
            loadSavedContactFiles,
            setUnsafeControlsDisabled
        };
    }

    window.createContactFilesUI =
        createContactFilesUI;
})();
