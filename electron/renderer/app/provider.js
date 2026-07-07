(function () {

    function createProviderUI({
        providerSelect,
        defaultProvider = "whatsapp",
        onProviderChange
    }) {

        function getSelectedProvider() {

            return providerSelect.value ||
                defaultProvider;
        }

        function setDisabled(disabled) {

            providerSelect.disabled =
                disabled;
        }

        function register() {

            providerSelect.addEventListener(
                "change",
                async () => {

                    if (onProviderChange) {

                        await onProviderChange();
                    }
                }
            );
        }

        return {
            getSelectedProvider,
            register,
            setDisabled
        };
    }

    window.BroadcastRendererProvider = {
        createProviderUI
    };
})();
