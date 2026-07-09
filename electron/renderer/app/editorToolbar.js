(function () {

    function createEditorToolbar({
        dom
    }) {

        function register() {

            if (!dom.templateInput) {

                return;
            }

            document
                .querySelectorAll("[data-editor-command]")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {
                            applyCommand(
                                button.dataset.editorCommand
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
                        }
                    );
                });

            dom.templateInput.addEventListener(
                "input",
                updateCharacterCount
            );

            updateCharacterCount();
        }

        function applyCommand(
            command
        ) {

            if (command === "bold") {

                wrapSelection(
                    "*",
                    "*"
                );

                return;
            }

            if (command === "italic") {

                wrapSelection(
                    "_",
                    "_"
                );

                return;
            }

            if (command === "list") {

                insertList();
                return;
            }

            if (command === "emoji") {

                insertText(
                    ":)"
                );
            }
        }

        function wrapSelection(
            prefix,
            suffix
        ) {

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
                ) ||
                "text";

            replaceSelection(
                `${prefix}${selectedText}${suffix}`,
                start + prefix.length,
                start + prefix.length + selectedText.length
            );
        }

        function insertList() {

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
                    "- "
                );

                return;
            }

            const listText =
                selectedText
                    .split(/\r?\n/)
                    .map(line => {
                        return line.trim()
                            ? `- ${line}`
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

        function replaceSelection(
            text,
            selectionStart,
            selectionEnd
        ) {

            const input =
                dom.templateInput;

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

            input.focus();

            input.setSelectionRange(
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
