(function () {

    function createSettingsUI({
        dom,
        electronAPI,
        getContactFilesUI,
        refreshValidationWarnings,
        showToast
    }) {

        function register() {

            dom.saveTemplateBtn.addEventListener(
                "click",
                async () => {

                    const template =
                        dom.templateInput.value;

                    try {
                        await electronAPI.saveTemplate(template);
                        showToast("Default template saved", "success");
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

            dom.templateInput.value =
                settings.defaultTemplate || "";

            dom.templateInput.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );

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
