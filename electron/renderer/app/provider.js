(function () {

    function createProviderUI({
        providerSelect,
        providerControl,
        templateInput,
        templatesPanel,
        defaultProvider = "whatsapp",
        onProviderChange
    }) {

        const channelTemplates = {
            telegram: "",
            whatsapp: ""
        };

        let activeProvider =
            normalizeProvider(providerSelect.value || defaultProvider);

        function getSelectedProvider() {
            return normalizeProvider(providerSelect.value || defaultProvider);
        }

        function getChannelTemplates() {
            rememberActiveTemplate();
            return {
                ...channelTemplates
            };
        }

        function initializeChannelTemplates(settings = {}) {
            const legacyTemplate =
                typeof settings.defaultTemplate === "string"
                    ? settings.defaultTemplate
                    : "";

            const savedTemplates =
                settings.channelTemplates &&
                typeof settings.channelTemplates === "object"
                    ? settings.channelTemplates
                    : {};

            channelTemplates.whatsapp =
                typeof savedTemplates.whatsapp === "string"
                    ? savedTemplates.whatsapp
                    : legacyTemplate;

            channelTemplates.telegram =
                typeof savedTemplates.telegram === "string"
                    ? savedTemplates.telegram
                    : legacyTemplate;

            activeProvider = getSelectedProvider();
            restoreActiveTemplate();
            applyProviderVisualState(activeProvider);
        }

        function setDisabled(disabled) {
            providerSelect.disabled = disabled;
        }

        function register() {
            applyProviderVisualState(activeProvider);

            if (templateInput) {
                templateInput.addEventListener(
                    "input",
                    rememberActiveTemplate
                );
            }

            providerSelect.addEventListener(
                "change",
                async () => {
                    rememberActiveTemplate();
                    activeProvider = getSelectedProvider();
                    restoreActiveTemplate();
                    applyProviderVisualState(activeProvider);

                    if (onProviderChange) {
                        try {
                            await onProviderChange(activeProvider);
                        } catch (error) {
                            console.error("Provider change failed:", error);
                        }
                    }
                }
            );
        }

        function rememberActiveTemplate() {
            if (!templateInput || !activeProvider) return;
            channelTemplates[activeProvider] = templateInput.value;
        }

        function restoreActiveTemplate() {
            if (!templateInput) return;
            templateInput.value = channelTemplates[activeProvider] || "";
            templateInput.dispatchEvent(
                new Event("input", { bubbles: true })
            );
        }

        function applyProviderVisualState(provider) {
            if (
                typeof document !== "undefined" &&
                document.body
            ) {
                document.body.dataset.channel = provider || "none";
            }

            [providerControl, templatesPanel].forEach(element => {
                if (!element) return;
                element.dataset.channel = provider || "none";
            });
            if (providerSelect) {
                providerSelect.setAttribute(
                    "aria-label",
                    `${provider === "telegram" ? "Telegram" : "WhatsApp"} selected channel`
                );
            }
        }

        return {
            getChannelTemplates,
            getSelectedProvider,
            initializeChannelTemplates,
            register,
            setDisabled
        };
    }

    function normalizeProvider(provider) {
        const normalized = String(provider || "").trim().toLowerCase();
        return normalized === "telegram" ? "telegram" : "whatsapp";
    }

    window.BroadcastRendererProvider = {
        createProviderUI
    };
})();
