(function () {

    function createSettingsUI({
        dom,
        electronAPI,
        getContactFilesUI,
        getSelectedProvider,
        initializeChannelTemplates,
        refreshValidationWarnings,
        showToast
    }) {

        function register() {

            dom.saveTemplateBtn.addEventListener(
                "click",
                async () => {

                    const template =
                        dom.templateInput.value;

                    const provider =
                        getSelectedProvider();

                    try {
                        await electronAPI.saveTemplate(template, provider);
                        showToast(
                            `${provider === "telegram" ? "Telegram" : "WhatsApp"} template saved`,
                            "success"
                        );
                    } catch (error) {
                        showToast(error.message || "Failed to save template", "error");
                    }
                }
            );
        }

        async function loadAppSettings() {

            let settings;
            try {
                settings = await electronAPI.loadSettings();
            } catch (error) {
                showToast(error.message || "Failed to load settings", "error");
                return;
            }

            initializeChannelTemplates(settings);

            const contactFilesUI =
                getContactFilesUI();

            if (contactFilesUI) {

                await contactFilesUI.loadSavedContactFiles();
            }

            await refreshValidationWarnings();
        }

        return {
            loadAppSettings,
            register
        };
    }

    window.BroadcastRendererSettings = {
        createSettingsUI
    };
})();
