(function () {

    function createNavigationUI({
        dom,
        electronAPI,
        getContactFilesUI
    }) {

        let helpVideoLoaded = false;

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

            dom.helpPage.classList.toggle(
                "hidden",
                page !== "help"
            );

            setActiveNav(
                page === "help"
                    ? dom.helpNavBtn
                    : page === "contacts" || page === "editor"
                        ? dom.contactsNavBtn
                        : dom.senderNavBtn
            );

            if (page === "help") {

                await loadHelpVideo();
            }

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

        async function loadHelpVideo() {

            if (helpVideoLoaded || !dom.helpVideoCard) {

                return;
            }

            helpVideoLoaded = true;

            try {

                const video =
                    await electronAPI.getHelpVideo();

                if (!video?.url || !video?.thumbnailUrl) {

                    return;
                }

                dom.helpVideoThumbnail.src =
                    video.thumbnailUrl;

                dom.helpVideoCard.disabled = false;
                dom.helpVideoCard.classList.remove(
                    "is-unavailable"
                );

            } catch (_error) {

                helpVideoLoaded = false;
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
                        await showPage("help");
                    }
                );
            }

            if (dom.helpVideoCard) {

                dom.helpVideoCard.addEventListener(
                    "click",
                    async () => {

                        if (!dom.helpVideoCard.disabled) {

                            await electronAPI.openHelpVideo();
                        }
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
