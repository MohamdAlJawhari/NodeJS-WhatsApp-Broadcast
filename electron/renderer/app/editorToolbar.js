(function () {

    function createEditorToolbar({
        dom
    }) {

        const undoStack = [];
        const redoStack = [];
        let isPreviewVisible = false;
        let generatedEmojiList = null;
        let linkCommandButton = null;
        let pendingLinkSelection = null;

        const emojiRanges = [
            [0x1F600, 0x1F64F],
            [0x1F300, 0x1F5FF],
            [0x1F680, 0x1F6FF],
            [0x1F900, 0x1F9FF],
            [0x1FA70, 0x1FAFF],
            [0x2600, 0x26FF],
            [0x2700, 0x27BF]
        ];

        function register() {

            if (!dom.templateInput) {

                return;
            }

            document
                .querySelectorAll("[data-editor-command]")
                .forEach(button => {

                    if (button.dataset.editorCommand === "link") {

                        linkCommandButton =
                            button;
                    }

                    button.addEventListener(
                        "click",
                        () => {
                            applyCommand(
                                button.dataset.editorCommand,
                                button
                            );
                        }
                    );
                });

            document
                .querySelectorAll("[data-template-insert]")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {
                            insertText(
                                button.dataset.templateInsert
                            );

                            closeToolbarMenu(
                                button
                            );
                            closeToolbarDropdowns();
                        }
                    );
                });

            document
                .querySelectorAll("[data-emoji-insert]")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {
                            insertText(
                                button.dataset.emojiInsert
                            );

                            closeToolbarMenu(
                                button
                            );
                            closeToolbarDropdowns();
                        }
                    );
                });

            document
                .querySelectorAll("[data-emoji-select]")
                .forEach(select => {

                    select.addEventListener(
                        "change",
                        () => {
                            insertFromSelect(
                                select
                            );
                        }
                    );
                });

            document
                .querySelectorAll("[data-variable-select]")
                .forEach(select => {

                    select.addEventListener(
                        "change",
                        () => {
                            insertFromSelect(
                                select
                            );
                        }
                    );
                });

            document
                .querySelectorAll("[data-editor-align]")
                .forEach(select => {

                    select.addEventListener(
                        "change",
                        () => {
                            setAlignment(
                                select.value
                            );
                        }
                    );
                });

            document
                .querySelectorAll("[data-editor-align-option]")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {
                            setAlignment(
                                button.dataset.editorAlignOption
                            );

                            closeToolbarDropdowns();
                        }
                    );
                });

            document
                .querySelectorAll(".toolbar-menu")
                .forEach(menu => {

                    menu.addEventListener(
                        "toggle",
                        () => {
                            if (menu.open) {

                                closeOtherToolbarMenus(
                                    menu
                                );
                            }
                        }
                    );
                });

            populateEmojiDropdown();
            bindGeneratedEmojiDropdown();
            bindToolbarDropdownTriggers();
            bindLinkDropdown();

            dom.templateInput.addEventListener(
                "input",
                () => {
                    updateCharacterCount();
                    updatePreview();
                }
            );

            dom.templateInput.addEventListener(
                "keydown",
                handleKeyboardShortcut
            );

            updateCharacterCount();
            updatePreview();
            syncAlignmentDropdown("start");
        }

        function populateEmojiDropdown() {

            const panel =
                dom.emojiDropdownMenu;

            if (
                !panel ||
                panel.dataset.generated === "true"
            ) {

                return;
            }

            panel.innerHTML =
                getEmojiList()
                    .map(emoji => {
                        const safeEmoji =
                            escapeHtml(
                                emoji
                            );

                        return `<button class="emoji-option" type="button" role="menuitem" data-emoji-insert="${safeEmoji}" aria-label="Insert ${safeEmoji}">${safeEmoji}</button>`;
                    })
                    .join("");

            panel.dataset.generated =
                "true";
        }

        function getEmojiList() {

            if (generatedEmojiList) {

                return generatedEmojiList;
            }

            const seen =
                new Set();

            generatedEmojiList =
                [];

            emojiRanges.forEach(range => {

                const start =
                    range[0];

                const end =
                    range[1];

                for (
                    let codePoint = start;
                    codePoint <= end;
                    codePoint++
                ) {

                    const emoji =
                        createEmojiForCodePoint(
                            codePoint
                        );

                    if (
                        emoji &&
                        !seen.has(emoji)
                    ) {

                        seen.add(
                            emoji
                        );

                        generatedEmojiList.push(
                            emoji
                        );
                    }
                }
            });

            return generatedEmojiList;
        }

        function createEmojiForCodePoint(
            codePoint
        ) {

            const character =
                String.fromCodePoint(
                    codePoint
                );

            if (/\p{Emoji_Presentation}/u.test(character)) {

                return character;
            }

            if (
                /\p{Emoji}/u.test(character) &&
                codePoint >= 0x2600 &&
                codePoint <= 0x27BF
            ) {

                return `${character}\uFE0F`;
            }

            return "";
        }

        function bindGeneratedEmojiDropdown() {

            if (
                !dom.emojiDropdownMenu ||
                dom.emojiDropdownMenu.dataset.bound === "true"
            ) {

                return;
            }

            dom.emojiDropdownMenu.addEventListener(
                "click",
                event => {
                    const button =
                        getClosestActionElement(
                            event,
                            "[data-emoji-insert]",
                            "emojiInsert"
                        );

                    if (
                        !button ||
                        !button.dataset.emojiInsert
                    ) {

                        return;
                    }

                    insertText(
                        button.dataset.emojiInsert
                    );

                    closeToolbarDropdowns();
                }
            );

            dom.emojiDropdownMenu.dataset.bound =
                "true";
        }

        function bindToolbarDropdownTriggers() {

            document
                .querySelectorAll("[data-editor-dropdown]")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        event => {
                            if (
                                event &&
                                typeof event.preventDefault === "function"
                            ) {

                                event.preventDefault();
                            }

                            if (
                                event &&
                                typeof event.stopPropagation === "function"
                            ) {

                                event.stopPropagation();
                            }

                            toggleToolbarDropdown(
                                button.dataset.editorDropdown,
                                button
                            );
                        }
                    );
                });

            if (
                document &&
                typeof document.addEventListener === "function"
            ) {

                document.addEventListener(
                    "click",
                    event => {
                        if (
                            !isInsideToolbarDropdown(
                                event.target
                            )
                        ) {

                            closeToolbarDropdowns();
                        }
                    }
                );

                document.addEventListener(
                    "keydown",
                    event => {
                        if (event.key === "Escape") {

                            closeToolbarDropdowns();
                        }
                    }
                );
            }

            if (
                window &&
                typeof window.addEventListener === "function"
            ) {

                window.addEventListener(
                    "resize",
                    closeToolbarDropdowns
                );
            }
        }

        function bindLinkDropdown() {

            if (
                !dom.linkDropdownMenu ||
                dom.linkDropdownMenu.dataset.bound === "true"
            ) {

                return;
            }

            if (dom.linkApplyBtn) {

                dom.linkApplyBtn.addEventListener(
                    "click",
                    applyPendingLink
                );
            }

            if (dom.linkCancelBtn) {

                dom.linkCancelBtn.addEventListener(
                    "click",
                    cancelPendingLink
                );
            }

            if (dom.linkUrlInput) {

                dom.linkUrlInput.addEventListener(
                    "keydown",
                    event => {
                        if (event.key === "Enter") {

                            event.preventDefault();
                            applyPendingLink();
                            return;
                        }

                        if (event.key === "Escape") {

                            event.preventDefault();
                            cancelPendingLink();
                        }
                    }
                );
            }

            dom.linkDropdownMenu.dataset.bound =
                "true";
        }

        function toggleToolbarDropdown(
            dropdownName,
            trigger
        ) {

            const panel =
                getToolbarDropdownPanel(
                    dropdownName
                );

            if (!panel) {

                return;
            }

            const wasOpen =
                !panel.classList.contains(
                    "hidden"
                );

            closeToolbarDropdowns();

            if (wasOpen) {

                return;
            }

            panel.classList.remove(
                "hidden"
            );

            if (trigger) {

                trigger.setAttribute(
                    "aria-expanded",
                    "true"
                );

                trigger.classList.add(
                    "active"
                );
            }

            positionToolbarDropdown(
                trigger,
                panel
            );
        }

        function getToolbarDropdownPanel(
            dropdownName
        ) {

            if (dropdownName === "emoji") {

                return dom.emojiDropdownMenu;
            }

            if (dropdownName === "alignment") {

                return dom.alignmentDropdownMenu;
            }

            if (dropdownName === "link") {

                return dom.linkDropdownMenu;
            }

            if (dropdownName === "variable") {

                return dom.variableDropdownMenu;
            }

            return null;
        }

        function positionToolbarDropdown(
            trigger,
            panel
        ) {

            if (
                !trigger ||
                !panel ||
                typeof trigger.getBoundingClientRect !== "function" ||
                typeof panel.getBoundingClientRect !== "function"
            ) {

                return;
            }

            const triggerRect =
                trigger.getBoundingClientRect();

            const panelRect =
                panel.getBoundingClientRect();

            const viewportWidth =
                window.innerWidth ||
                1024;

            const viewportHeight =
                window.innerHeight ||
                768;

            const gutter =
                8;

            const panelWidth =
                Math.min(
                    panelRect.width || 280,
                    viewportWidth - gutter * 2
                );

            const panelHeight =
                Math.min(
                    panelRect.height || 260,
                    viewportHeight - gutter * 2
                );

            const left =
                Math.max(
                    gutter,
                    Math.min(
                        triggerRect.left,
                        viewportWidth - panelWidth - gutter
                    )
                );

            const bottomTop =
                triggerRect.bottom + 8;

            const top =
                bottomTop + panelHeight <= viewportHeight - gutter
                    ? bottomTop
                    : Math.max(
                        gutter,
                        triggerRect.top - panelHeight - 8
                    );

            panel.style.left =
                `${left}px`;

            panel.style.top =
                `${top}px`;
        }

        function closeToolbarDropdowns() {

            [
                dom.alignmentDropdownMenu,
                dom.emojiDropdownMenu,
                dom.linkDropdownMenu,
                dom.variableDropdownMenu
            ].forEach(panel => {

                if (panel) {

                    panel.classList.add(
                        "hidden"
                    );
                }
            });

            document
                .querySelectorAll("[data-editor-dropdown]")
                .forEach(button => {

                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                    button.classList.remove(
                        "active"
                    );
                });

            setLinkTriggerActive(
                false
            );
        }

        function setLinkTriggerActive(
            active
        ) {

            if (!linkCommandButton) {

                return;
            }

            linkCommandButton.setAttribute(
                "aria-expanded",
                active
                    ? "true"
                    : "false"
            );

            linkCommandButton.classList.toggle(
                "active",
                active
            );
        }

        function isInsideToolbarDropdown(
            target
        ) {

            if (
                !target ||
                typeof target.closest !== "function"
            ) {

                return false;
            }

            return Boolean(
                target.closest(
                    ".toolbar-dropdown"
                ) ||
                target.closest(
                    ".toolbar-dropdown-panel"
                )
            );
        }

        function getClosestActionElement(
            event,
            selector,
            datasetKey
        ) {

            if (
                !event ||
                !event.target
            ) {

                return null;
            }

            if (typeof event.target.closest === "function") {

                return event.target.closest(
                    selector
                );
            }

            if (
                event.target.dataset &&
                event.target.dataset[datasetKey]
            ) {

                return event.target;
            }

            return null;
        }

        function applyCommand(
            command,
            trigger
        ) {

            const commandHandlers = {
                bold: () => wrapSelection(
                    "*",
                    "*"
                ),
                italic: () => wrapSelection(
                    "_",
                    "_"
                ),
                underline: () => wrapSelection(
                    "__",
                    "__"
                ),
                strikethrough: () => wrapSelection(
                    "~",
                    "~"
                ),
                link: () => insertLink(
                    trigger
                ),
                list: () => insertList({
                    ordered: false
                }),
                "bullet-list": () => insertList({
                    ordered: false
                }),
                "numbered-list": () => insertList({
                    ordered: true
                }),
                undo,
                redo,
                "clear-formatting": clearFormatting,
                "toggle-preview": togglePreview
            };

            const handler =
                commandHandlers[command];

            if (handler) {

                handler();
            }
        }

        function handleKeyboardShortcut(
            event
        ) {

            if (
                !event.ctrlKey &&
                !event.metaKey
            ) {

                return;
            }

            const key =
                String(event.key || "")
                    .toLowerCase();

            if (key === "b") {

                event.preventDefault();
                applyCommand("bold");
                return;
            }

            if (key === "i") {

                event.preventDefault();
                applyCommand("italic");
                return;
            }

            if (key === "u") {

                event.preventDefault();
                applyCommand("underline");
                return;
            }

            if (key === "k") {

                event.preventDefault();
                applyCommand("link");
                return;
            }

            if (
                key === "p" &&
                event.shiftKey
            ) {

                event.preventDefault();
                applyCommand("toggle-preview");
                return;
            }

            if (key === "z") {

                if (
                    event.shiftKey &&
                    redoStack.length > 0
                ) {

                    event.preventDefault();
                    redo();
                    return;
                }

                if (undoStack.length > 0) {

                    event.preventDefault();
                    undo();
                }

                return;
            }

            if (
                key === "y" &&
                redoStack.length > 0
            ) {

                event.preventDefault();
                redo();
            }
        }

        function wrapSelection(
            prefix,
            suffix
        ) {

            ensureRawMode();

            const input =
                dom.templateInput;

            const start =
                input.selectionStart;

            const end =
                input.selectionEnd;

            const selectedText =
                input.value.slice(
                    start,
                    end
                );

            const normalizedSelection =
                normalizeSelectionForWrapping(
                    selectedText
                );

            const textToWrap =
                normalizedSelection.text ||
                "text";

            const replacementText =
                `${normalizedSelection.leading}${prefix}${textToWrap}${suffix}${normalizedSelection.trailing}`;

            const wrappedSelectionStart =
                start +
                normalizedSelection.leading.length +
                prefix.length;

            replaceSelection(
                replacementText,
                wrappedSelectionStart,
                wrappedSelectionStart + textToWrap.length
            );
        }

        function normalizeSelectionForWrapping(
            selectedText
        ) {

            const leading =
                selectedText.match(/^\s*/)[0];

            const trailing =
                selectedText
                    .slice(leading.length)
                    .match(/\s*$/)[0];

            const text =
                selectedText.slice(
                    leading.length,
                    selectedText.length - trailing.length
                );

            return {
                leading,
                text,
                trailing
            };
        }

        function insertLink(
            trigger
        ) {

            ensureRawMode();

            const linkContext =
                getLinkContext();

            if (
                dom.linkDropdownMenu &&
                dom.linkUrlInput
            ) {

                openLinkDropdown(
                    trigger ||
                    linkCommandButton,
                    linkContext
                );

                return;
            }

            insertLinkWithPrompt(
                linkContext
            );
        }

        function getLinkContext() {

            const input =
                dom.templateInput;

            const start =
                input.selectionStart;

            const end =
                input.selectionEnd;

            const selectedText =
                input.value.slice(
                    start,
                    end
                );

            const normalizedSelection =
                normalizeSelectionForWrapping(
                    selectedText
                );

            const linkText =
                normalizedSelection.text ||
                "link text";

            return {
                end,
                linkText,
                normalizedSelection,
                start
            };
        }

        function insertLinkWithPrompt(
            linkContext
        ) {

            const promptFn =
                window &&
                typeof window.prompt === "function"
                    ? window.prompt
                    : null;

            const url =
                promptFn
                    ? promptFn(
                        "Enter link URL",
                        "https://"
                    )
                    : "https://";

            if (url === null) {

                return;
            }

            applyLinkReplacement(
                linkContext,
                url
            );
        }

        function openLinkDropdown(
            trigger,
            linkContext
        ) {

            pendingLinkSelection =
                linkContext;

            closeToolbarDropdowns();

            dom.linkDropdownMenu.classList.remove(
                "hidden"
            );

            setLinkTriggerActive(
                true
            );

            positionToolbarDropdown(
                trigger,
                dom.linkDropdownMenu
            );

            dom.linkUrlInput.value =
                "https://";

            if (typeof dom.linkUrlInput.focus === "function") {

                dom.linkUrlInput.focus();
            }

            if (typeof dom.linkUrlInput.select === "function") {

                dom.linkUrlInput.select();
            }
        }

        function applyPendingLink() {

            if (!pendingLinkSelection) {

                closeToolbarDropdowns();
                return;
            }

            const url =
                dom.linkUrlInput &&
                dom.linkUrlInput.value
                    ? dom.linkUrlInput.value.trim()
                    : "https://";

            applyLinkReplacement(
                pendingLinkSelection,
                url || "https://"
            );

            pendingLinkSelection =
                null;

            closeToolbarDropdowns();
        }

        function cancelPendingLink() {

            const linkContext =
                pendingLinkSelection;

            pendingLinkSelection =
                null;

            closeToolbarDropdowns();

            if (linkContext) {

                setSelection(
                    linkContext.start,
                    linkContext.end
                );
            }
        }

        function applyLinkReplacement(
            linkContext,
            url
        ) {

            setSelection(
                linkContext.start,
                linkContext.end
            );

            const replacementText =
                `${linkContext.normalizedSelection.leading}[${linkContext.linkText}](${url || "https://"})${linkContext.normalizedSelection.trailing}`;

            const nextSelectionStart =
                linkContext.start +
                linkContext.normalizedSelection.leading.length + 1;

            replaceSelection(
                replacementText,
                nextSelectionStart,
                nextSelectionStart + linkContext.linkText.length
            );
        }

        function insertList({
            ordered = false
        } = {}) {

            ensureRawMode();

            const input =
                dom.templateInput;

            const start =
                input.selectionStart;

            const end =
                input.selectionEnd;

            const selectedText =
                input.value.slice(
                    start,
                    end
                );

            if (!selectedText) {

                insertText(
                    ordered
                        ? "1. "
                        : "- "
                );

                return;
            }

            const listText =
                selectedText
                    .split(/\r?\n/)
                    .map((line, index) => {
                        return line.trim()
                            ? `${ordered ? `${index + 1}.` : "-"} ${line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "")}`
                            : line;
                    })
                    .join("\n");

            replaceSelection(
                listText,
                start,
                start + listText.length
            );
        }

        function insertText(
            text
        ) {

            if (!text) {

                return;
            }

            ensureRawMode();

            const input =
                dom.templateInput;

            const start =
                input.selectionStart;

            replaceSelection(
                text,
                start + text.length,
                start + text.length
            );
        }

        function insertFromSelect(
            select
        ) {

            if (
                !select ||
                !select.value
            ) {

                return;
            }

            insertText(
                select.value
            );

            select.value =
                "";
        }

        function clearFormatting() {

            ensureRawMode();

            const input =
                dom.templateInput;

            const start =
                input.selectionStart;

            const end =
                input.selectionEnd;

            const hasSelection =
                start !== end;

            if (
                !hasSelection &&
                input.value &&
                !confirmFullMessageClear()
            ) {

                return;
            }

            const targetStart =
                hasSelection
                    ? start
                    : 0;

            const targetEnd =
                hasSelection
                    ? end
                    : input.value.length;

            const cleanedText =
                removeMarkdownFormatting(
                    input.value.slice(
                        targetStart,
                        targetEnd
                    )
                );

            setSelection(
                targetStart,
                targetEnd
            );

            replaceSelection(
                cleanedText,
                targetStart,
                targetStart + cleanedText.length
            );
        }

        function removeMarkdownFormatting(
            text
        ) {

            let cleanedText =
                String(text || "");

            cleanedText =
                cleanedText.replace(
                    /\[([^\]]+)]\([^)]+\)/g,
                    "$1"
                );

            cleanedText =
                cleanedText.replace(
                    /(^|\n)\s*(?:[-*]|\d+\.)\s+/g,
                    "$1"
                );

            [
                /\*\*([^*]+)\*\*/g,
                /\*([^*]+)\*/g,
                /__([^_]+)__/g,
                /_([^_]+)_/g,
                /~([^~]+)~/g
            ].forEach(pattern => {

                cleanedText =
                    cleanedText.replace(
                        pattern,
                        "$1"
                    );
            });

            return cleanedText;
        }

        function confirmFullMessageClear() {

            if (
                !window ||
                typeof window.confirm !== "function"
            ) {

                return true;
            }

            return window.confirm(
                "Clear formatting from the entire message?"
            );
        }

        function replaceSelection(
            text,
            selectionStart,
            selectionEnd
        ) {

            const input =
                dom.templateInput;

            saveUndoSnapshot();

            const start =
                input.selectionStart;

            const end =
                input.selectionEnd;

            input.value =
                input.value.slice(
                    0,
                    start
                ) +
                text +
                input.value.slice(end);

            setSelection(
                selectionStart,
                selectionEnd
            );

            input.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );
        }

        function togglePreview() {

            setPreviewVisible(
                !isPreviewVisible
            );
        }

        function setPreviewVisible(
            visible
        ) {

            if (!dom.templatePreview) {

                return;
            }

            isPreviewVisible =
                visible;

            dom.templateInput.classList.toggle(
                "hidden",
                visible
            );

            dom.templatePreview.classList.toggle(
                "hidden",
                !visible
            );

            if (dom.templatePreviewToggle) {

                dom.templatePreviewToggle.setAttribute(
                    "aria-pressed",
                    visible
                        ? "true"
                        : "false"
                );

                dom.templatePreviewToggle.classList.toggle(
                    "active",
                    visible
                );

                dom.templatePreviewToggle.setAttribute(
                    "aria-label",
                    visible
                        ? "Hide preview"
                        : "Show preview"
                );

                dom.templatePreviewToggle.setAttribute(
                    "title",
                    visible
                        ? "Hide preview"
                        : "Show preview"
                );
            }

            if (visible) {

                updatePreview();
                return;
            }

            dom.templateInput.focus();
        }

        function updatePreview() {

            if (!dom.templatePreview) {

                return;
            }

            dom.templatePreview.innerHTML =
                renderMarkdownPreview(
                    dom.templateInput.value
                );
        }

        function renderMarkdownPreview(
            text
        ) {

            const lines =
                String(text || "")
                    .split(/\r?\n/);

            if (
                lines.length === 1 &&
                lines[0].trim() === ""
            ) {

                return "<p class=\"template-preview-empty\">No message preview</p>";
            }

            let html =
                "";

            let openList =
                null;

            function closeList() {

                if (!openList) {

                    return;
                }

                html +=
                    `</${openList}>`;

                openList =
                    null;
            }

            function ensureList(
                type
            ) {

                if (openList === type) {

                    return;
                }

                closeList();

                openList =
                    type;

                html +=
                    `<${type}>`;
            }

            lines.forEach(line => {

                const bulletMatch =
                    line.match(/^\s*[-*]\s+(.+)$/);

                if (bulletMatch) {

                    ensureList("ul");
                    html +=
                        `<li>${renderInlineMarkdown(bulletMatch[1])}</li>`;
                    return;
                }

                const numberedMatch =
                    line.match(/^\s*\d+\.\s+(.+)$/);

                if (numberedMatch) {

                    ensureList("ol");
                    html +=
                        `<li>${renderInlineMarkdown(numberedMatch[1])}</li>`;
                    return;
                }

                closeList();

                if (line.trim() === "") {

                    html +=
                        "<br>";
                    return;
                }

                html +=
                    `<p>${renderInlineMarkdown(line)}</p>`;
            });

            closeList();

            return html;
        }

        function renderInlineMarkdown(
            text
        ) {

            return escapeHtml(text)
                .replace(
                    /\[([^\]]+)]\(([^)]+)\)/g,
                    "<a href=\"$2\">$1</a>"
                )
                .replace(
                    /__([^_]+)__/g,
                    "<u>$1</u>"
                )
                .replace(
                    /\*\*([^*]+)\*\*/g,
                    "<strong>$1</strong>"
                )
                .replace(
                    /\*([^*]+)\*/g,
                    "<strong>$1</strong>"
                )
                .replace(
                    /_([^_]+)_/g,
                    "<em>$1</em>"
                )
                .replace(
                    /~([^~]+)~/g,
                    "<s>$1</s>"
                );
        }

        function escapeHtml(
            text
        ) {

            return String(text || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        function setAlignment(
            alignment
        ) {

            const nextAlignment =
                [
                    "start",
                    "left",
                    "center",
                    "right"
                ].includes(alignment)
                    ? alignment
                    : "start";

            if (dom.templatesPanel) {

                dom.templatesPanel.dataset.editorAlign =
                    nextAlignment;
            }

            syncAlignmentDropdown(
                nextAlignment
            );

            [
                dom.templateInput,
                dom.templatePreview
            ].forEach(element => {

                if (
                    element &&
                    element.style
                ) {

                    element.style.textAlign =
                        nextAlignment === "start"
                            ? ""
                            : nextAlignment;
                }
            });
        }

        function syncAlignmentDropdown(
            alignment
        ) {

            document
                .querySelectorAll("[data-editor-align-option]")
                .forEach(button => {

                    const isActive =
                        button.dataset.editorAlignOption ===
                        alignment;

                    button.setAttribute(
                        "aria-checked",
                        isActive
                            ? "true"
                            : "false"
                    );

                    button.classList.toggle(
                        "active",
                        isActive
                    );
                });
        }

        function closeToolbarMenu(
            childElement
        ) {

            if (
                !childElement ||
                typeof childElement.closest !== "function"
            ) {

                return;
            }

            const menu =
                childElement.closest(
                    ".toolbar-menu"
                );

            if (menu) {

                menu.open =
                    false;
            }
        }

        function closeOtherToolbarMenus(
            currentMenu
        ) {

            document
                .querySelectorAll(".toolbar-menu")
                .forEach(menu => {

                    if (menu !== currentMenu) {

                        menu.open =
                            false;
                    }
                });
        }

        function getSnapshot() {

            return {
                selectionEnd:
                    dom.templateInput.selectionEnd,
                selectionStart:
                    dom.templateInput.selectionStart,
                value:
                    dom.templateInput.value
            };
        }

        function saveUndoSnapshot() {

            undoStack.push(
                getSnapshot()
            );

            redoStack.length =
                0;
        }

        function restoreSnapshot(
            snapshot
        ) {

            dom.templateInput.value =
                snapshot.value;

            setSelection(
                snapshot.selectionStart,
                snapshot.selectionEnd
            );

            dom.templateInput.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );
        }

        function undo() {

            if (undoStack.length === 0) {

                return;
            }

            redoStack.push(
                getSnapshot()
            );

            restoreSnapshot(
                undoStack.pop()
            );
        }

        function redo() {

            if (redoStack.length === 0) {

                return;
            }

            undoStack.push(
                getSnapshot()
            );

            restoreSnapshot(
                redoStack.pop()
            );
        }

        function ensureRawMode() {

            if (isPreviewVisible) {

                setPreviewVisible(
                    false
                );
            }
        }

        function setSelection(
            start,
            end
        ) {

            dom.templateInput.focus();

            dom.templateInput.setSelectionRange(
                start,
                end
            );
        }

        function updateCharacterCount() {

            if (!dom.templateCharCount) {

                return;
            }

            const count =
                dom.templateInput.value.length;

            dom.templateCharCount.innerText =
                `${count} ${count === 1 ? "character" : "characters"}`;
        }

        return {
            register,
            updateCharacterCount
        };
    }

    window.BroadcastRendererEditorToolbar = {
        createEditorToolbar
    };
})();
