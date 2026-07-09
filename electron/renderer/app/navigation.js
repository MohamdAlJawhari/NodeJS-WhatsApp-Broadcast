(function () {

    function createNavigationUI({
        dom,
        getContactFilesUI
    }) {

        async function showPage(
            page
        ) {

            dom.mainPage.classList.toggle(
                "hidden",
                page !== "sender"
            );

            dom.contactsPage.classList.toggle(
                "hidden",
                page !== "contacts"
            );

            dom.contactEditorPage.classList.toggle(
                "hidden",
                page !== "editor"
            );

            setActiveNav(
                page === "contacts" ||
                page === "editor"
                    ? dom.contactsNavBtn
                    : dom.senderNavBtn
            );

            if (page === "contacts") {

                const contactFilesUI =
                    getContactFilesUI();

                if (contactFilesUI) {

                    try {
                        await contactFilesUI.loadSavedContactFiles();
                    } catch (error) {
                        console.error("Failed to load contact files:", error);
                    }
                }
            }
        }

        function setActiveNav(
            activeButton
        ) {

            [
                dom.senderNavBtn,
                dom.contactsNavBtn,
                dom.templatesNavBtn,
                dom.logsNavBtn,
                dom.settingsNavBtn,
                dom.helpNavBtn
            ].forEach(button => {

                if (!button) {

                    return;
                }

                button.classList.toggle(
                    "active",
                    button === activeButton
                );
            });
        }

        async function showSenderPanel(
            button,
            panel
        ) {

            await showPage("sender");

            setActiveNav(button);

            if (panel) {

                panel.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }

        function register() {

            dom.senderNavBtn.addEventListener(
                "click",
                () => {
                    showPage("sender");
                }
            );

            dom.contactsNavBtn.addEventListener(
                "click",
                async () => {
                    await showPage("contacts");
                }
            );

            if (dom.contactsPreviewBtn) {

                dom.contactsPreviewBtn.addEventListener(
                    "click",
                    async () => {
                        await showPage("contacts");
                    }
                );
            }

            if (dom.templatesNavBtn) {

                dom.templatesNavBtn.addEventListener(
                    "click",
                    async () => {
                        await showSenderPanel(
                            dom.templatesNavBtn,
                            dom.templatesPanel
                        );

                        if (dom.templateInput) {

                            dom.templateInput.focus();
                        }
                    }
                );
            }

            if (dom.logsNavBtn) {

                dom.logsNavBtn.addEventListener(
                    "click",
                    async () => {
                        await showSenderPanel(
                            dom.logsNavBtn,
                            dom.logsPanel
                        );
                    }
                );
            }

            if (dom.settingsNavBtn) {

                dom.settingsNavBtn.addEventListener(
                    "click",
                    async () => {
                        await showSenderPanel(
                            dom.settingsNavBtn,
                            dom.connectionPanel
                        );
                    }
                );
            }

            if (dom.helpNavBtn) {

                dom.helpNavBtn.addEventListener(
                    "click",
                    async () => {
                        await showSenderPanel(
                            dom.helpNavBtn,
                            dom.validationPanel
                        );
                    }
                );
            }

            if (dom.contactsBackToSenderBtn) {

                dom.contactsBackToSenderBtn.addEventListener(
                    "click",
                    () => {
                        showPage("sender");
                    }
                );
            }
        }

        return {
            register,
            showPage
        };
    }

    window.BroadcastRendererNavigation = {
        createNavigationUI
    };
})();
