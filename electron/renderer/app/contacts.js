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

            dom.addContactsFileBtn.addEventListener(
                "click",
                async () => {

                    await loadContactsFile({
                        showContactsPageAfterLoad: true
                    });
                }
            );
        }

        async function loadContactsFile({
            showContactsPageAfterLoad = false
        } = {}) {

            dom.status.innerText =
                "Loading contacts...";

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

        return {
            loadContactsFile,
            register
        };
    }

    window.BroadcastRendererContacts = {
        createContactsUI
    };
})();
