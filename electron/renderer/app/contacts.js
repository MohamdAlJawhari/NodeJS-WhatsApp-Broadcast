(function () {

    function createContactsUI({
        dom,
        electronAPI,
        getSelectedProvider,
        getContactFilesUI,
        setContacts,
        resetValidationWarnings,
        refreshValidationWarnings,
        showPage,
        showToast
    }) {

        function register() {

            [
                dom.addContactsFileBtn,
                dom.contactsAddFileBtn
            ].forEach(button => {

                if (!button) {

                    return;
                }

                button.addEventListener(
                    "click",
                    async () => {

                        await loadContactsFile({
                            showContactsPageAfterLoad: true
                        });
                    }
                );
            });
        }

        async function loadContactsFile({
            showContactsPageAfterLoad = false
        } = {}) {

            dom.status.innerText =
                "Loading contacts...";

            updateContactsDisplay({
                statusText:
                    "Loading contacts..."
            });

            const result =
                await electronAPI
                    .selectContactsFile({
                        provider:
                            getSelectedProvider()
                    });

            if (!result.success) {

                dom.status.innerText =
                    result.error ||
                    "File selection canceled";

                updateContactsDisplay({
                    statusText:
                        dom.status.innerText
                });

                if (result.error) {

                    showToast(
                        result.error,
                        "error"
                    );
                }

                return;
            }

            setContacts(
                result.contacts
            );

            resetValidationWarnings();

            const contactFilesUI =
                getContactFilesUI();

            if (contactFilesUI) {

                contactFilesUI.clearSelectedContactFile();
            }

            dom.status.innerText =
                `Loaded ${result.count} contacts`;

            updateContactsDisplay({
                filePath:
                    result.filePath,
                count:
                    result.count,
                statusText:
                    dom.status.innerText
            });

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

            if (contactFilesUI) {

                await contactFilesUI.loadSavedContactFiles();
            }

            await refreshValidationWarnings();

            if (showContactsPageAfterLoad) {

                await showPage("contacts");
            }
        }

        function updateContactsDisplay({
            filePath,
            count,
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
            loadContactsFile,
            register
        };
    }

    window.BroadcastRendererContacts = {
        createContactsUI
    };
})();
