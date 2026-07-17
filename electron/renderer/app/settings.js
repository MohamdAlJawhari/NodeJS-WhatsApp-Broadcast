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

            dom.saveTelegramCredentialsBtn.addEventListener(
                "click",
                saveTelegramCredentials
            );

            dom.deleteTelegramCredentialsBtn.addEventListener(
                "click",
                deleteTelegramCredentials
            );

            dom.toggleTelegramCredentialsBtn.addEventListener(
                "click",
                toggleTelegramCredentials
            );
        }

        function toggleTelegramCredentials() {

            const willOpen =
                dom.telegramCredentialsCard.classList.contains("hidden");

            dom.telegramCredentialsCard.classList.toggle("hidden", !willOpen);
            dom.toggleTelegramCredentialsBtn.setAttribute(
                "aria-expanded",
                String(willOpen)
            );

            const action = willOpen ? "Hide" : "Show";

            dom.toggleTelegramCredentialsBtn.setAttribute(
                "aria-label",
                `${action} Telegram credentials`
            );
            dom.toggleTelegramCredentialsBtn.title =
                `${action} Telegram credentials`;

            if (willOpen && !dom.telegramApiIdInput.value) {

                dom.telegramApiIdInput.focus();
            }
        }

        async function saveTelegramCredentials() {

            let result;
            try {
                result =
                    await electronAPI.saveTelegramCredentials({
                        apiId: dom.telegramApiIdInput.value,
                        apiHash: dom.telegramApiHashInput.value
                    });
            } catch (error) {
                showToast(
                    error.message || "Failed to save Telegram credentials",
                    "error"
                );
                return;
            }

            if (!result.success) {

                showToast(
                    result.error || "Failed to save Telegram credentials",
                    "error"
                );
                return;
            }

            clearCredentialInputs();
            renderTelegramCredentialsStatus(result);
            showToast("Telegram credentials saved securely", "success");
        }

        async function deleteTelegramCredentials() {

            const confirmed = window.confirm(
                "Delete the saved Telegram API ID and API hash?"
            );

            if (!confirmed) {

                return;
            }

            let result;
            try {
                result = await electronAPI.deleteTelegramCredentials();
            } catch (error) {
                showToast(
                    error.message || "Failed to delete Telegram credentials",
                    "error"
                );
                return;
            }

            clearCredentialInputs();
            renderTelegramCredentialsStatus(result);
            showToast("Telegram credentials deleted", "success");
        }

        function clearCredentialInputs() {

            dom.telegramApiIdInput.value = "";
            dom.telegramApiHashInput.value = "";
        }

        function renderTelegramCredentialsStatus(status = {}) {

            if (status.configured) {

                dom.telegramCredentialsStatus.innerText =
                    `Saved securely · API ID ${status.maskedApiId}`;
                dom.deleteTelegramCredentialsBtn.disabled = false;
                dom.saveTelegramCredentialsBtn.innerText = "Replace credentials";
                return;
            }

            dom.telegramCredentialsStatus.innerText = "Not configured";
            dom.deleteTelegramCredentialsBtn.disabled = true;
            dom.saveTelegramCredentialsBtn.innerText = "Save credentials";
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

            try {
                renderTelegramCredentialsStatus(
                    await electronAPI.getTelegramCredentialsStatus()
                );
            } catch (error) {
                renderTelegramCredentialsStatus();
                showToast(
                    error.message || "Failed to load Telegram credential status",
                    "error"
                );
            }

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
