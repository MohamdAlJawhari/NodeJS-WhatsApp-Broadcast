(function () {

    const connectionStateClasses = [
        "connection-connected",
        "connection-connecting",
        "connection-waiting",
        "connection-error"
    ];

    function createConnectionUI({
        dom,
        electronAPI,
        qrUI,
        showToast,
        onBroadcastButtonsRefresh
    }) {

        let isWhatsAppConnecting = false;
        let isWhatsAppConnected = false;
        let isTelegramConnecting = false;
        let isTelegramConnected = false;
        let unsafeControlsDisabled = false;
        let whatsAppConnectedHandled = false;
        let connectionStartedAt = null;
        let connectionTimerId = null;

        function refreshBroadcastButtons() {

            if (onBroadcastButtonsRefresh) {

                onBroadcastButtonsRefresh();
                return;
            }

            updateConnectButton();
            updateTelegramConnectButton();
        }

        async function connectWhatsApp() {

            if (isWhatsAppConnecting) {

                return;
            }

            if (isWhatsAppConnected) {

                showToast(
                    "WhatsApp is already connected",
                    "info"
                );

                return;
            }

            isWhatsAppConnecting =
                true;
            whatsAppConnectedHandled =
                false;

            updateConnectButton();

            setConnectionStatus(
                "Connecting..."
            );

            startConnectionTimer();

            let result;

            try {

                result =
                    await electronAPI
                        .connectWhatsApp();

            } catch (error) {

                result = {
                    success: false,
                    error:
                        (error && error.message) || String(error)
                };
            }

            if (!result.success) {

                stopConnectionTimer(
                    "Failed"
                );

                setConnectionStatus(
                    result.error
                );

                showToast(
                    result.error,
                    "error"
                );

            } else {

                handleWhatsAppConnected({
                    alreadyConnected:
                        result.alreadyConnected
                });
            }

            isWhatsAppConnecting =
                false;

            refreshBroadcastButtons();
        }

        async function connectTelegram() {

            if (isTelegramConnecting) {

                return;
            }

            if (isTelegramConnected) {

                showToast(
                    "Telegram is already connected",
                    "info"
                );

                return;
            }

            isTelegramConnecting =
                true;

            updateTelegramConnectButton();

            setTelegramConnectionStatus(
                "Connecting..."
            );

            let result;

            try {

                result =
                    await electronAPI
                        .connectTelegram();

            } catch (error) {

                result = {
                    success: false,
                    error:
                        error.message
                };
            }

            if (!result.success) {

                setTelegramConnectionStatus(
                    result.error
                );

                showToast(
                    result.error,
                    "error"
                );

            } else {

                setTelegramConnectionStatus(
                    "CONNECTED"
                );

                qrUI.hideTelegramQr();

                showToast(
                    result.alreadyConnected
                        ? "Telegram is already connected"
                        : "Telegram connected",
                    "success"
                );
            }

            isTelegramConnecting =
                false;

            refreshBroadcastButtons();
        }

        function startConnectionTimer() {

            connectionStartedAt =
                Date.now();

            updateConnectionTimer(
                "Connecting"
            );

            clearInterval(
                connectionTimerId
            );

            connectionTimerId =
                setInterval(
                    () => {
                        updateConnectionTimer(
                            "Connecting"
                        );
                    },
                    1000
                );
        }

        function stopConnectionTimer(
            label
        ) {

            if (connectionTimerId) {

                clearInterval(
                    connectionTimerId
                );

                connectionTimerId =
                    null;
            }

            updateConnectionTimer(
                label
            );
        }

        function updateConnectionTimer(
            label
        ) {

            const elapsedMs =
                connectionStartedAt
                    ? Date.now() - connectionStartedAt
                    : 0;

            dom.connectionTimer.innerText =
                `${label}: ${formatConnectionElapsed(elapsedMs)}`;
        }

        function formatConnectionElapsed(
            elapsedMs
        ) {

            const totalSeconds =
                Math.max(
                    0,
                    Math.floor(elapsedMs / 1000)
                );

            const minutes =
                Math.floor(totalSeconds / 60);

            const seconds =
                totalSeconds % 60;

            return [
                minutes,
                seconds
            ].map(value => {
                return String(value).padStart(2, "0");
            }).join(":");
        }

        function setConnectionStatus(
            text
        ) {

            const nextText =
                text ||
                "Not connected";

            dom.connectionStatus.innerText =
                nextText;

            dom.connectionTile.classList.remove(
                ...connectionStateClasses
            );

            const connectionState =
                getConnectionState(nextText);

            dom.connectionTile.classList.add(
                `connection-${connectionState}`
            );

            isWhatsAppConnected =
                connectionState === "connected";

            updateConnectButton();
        }

        function updateConnectButton() {

            if (isWhatsAppConnected) {

                dom.connectBtn.innerText =
                    "WhatsApp Connected";

                dom.connectBtn.disabled =
                    true;

                return;
            }

            if (isWhatsAppConnecting) {

                dom.connectBtn.innerText =
                    "Connecting...";

                dom.connectBtn.disabled =
                    true;

                return;
            }

            dom.connectBtn.innerText =
                "Connect WhatsApp";

            dom.connectBtn.disabled =
                unsafeControlsDisabled;
        }

        function setTelegramConnectionStatus(
            text
        ) {

            const nextText =
                text ||
                "Telegram not connected";

            dom.telegramConnectionStatus.innerText =
                nextText;

            const connectionState =
                getConnectionState(nextText);

            isTelegramConnected =
                connectionState === "connected";

            updateTelegramConnectButton();
        }

        function handleWhatsAppConnected({
            alreadyConnected = false
        } = {}) {

            setConnectionStatus(
                "CONNECTED"
            );

            if (whatsAppConnectedHandled) {

                return;
            }

            whatsAppConnectedHandled =
                true;

            stopConnectionTimer(
                "Connected"
            );

            qrUI.hideWhatsAppQr();

            showToast(
                alreadyConnected
                    ? "WhatsApp is already connected"
                    : "WhatsApp connected",
                alreadyConnected
                    ? "info"
                    : "success"
            );
        }

        function updateTelegramConnectButton() {

            if (isTelegramConnected) {

                dom.connectTelegramBtn.innerText =
                    "Telegram Connected";

                dom.connectTelegramBtn.disabled =
                    true;

                return;
            }

            if (isTelegramConnecting) {

                dom.connectTelegramBtn.innerText =
                    "Connecting Telegram...";

                dom.connectTelegramBtn.disabled =
                    true;

                return;
            }

            dom.connectTelegramBtn.innerText =
                "Connect Telegram";

            dom.connectTelegramBtn.disabled =
                unsafeControlsDisabled;
        }

        function getConnectionState(
            text
        ) {

            const normalized =
                String(text)
                    .toLowerCase();

            if (
                normalized.includes("not connected") ||
                normalized.includes("not_connected") ||
                normalized.includes("notconnected") ||
                normalized.includes("not logged")
            ) {

                return "waiting";
            }

            if (
                normalized.includes("failed") ||
                normalized.includes("error") ||
                normalized.includes("disconnect") ||
                normalized.includes("closed") ||
                normalized.includes("timeout")
            ) {

                return "error";
            }

            if (
                normalized.includes("connecting") ||
                normalized.includes("qr") ||
                normalized.includes("scan") ||
                normalized.includes("loading") ||
                normalized.includes("starting")
            ) {

                return "connecting";
            }

            if (
                normalized === "connected" ||
                normalized.includes(" connected") ||
                normalized.includes("inchat") ||
                normalized.includes("islogged")
            ) {

                return "connected";
            }

            return "waiting";
        }

        function setUnsafeControlsDisabled(
            disabled
        ) {

            unsafeControlsDisabled =
                disabled;

            updateConnectButton();
            updateTelegramConnectButton();
        }

        function register() {

            dom.connectBtn.addEventListener(
                "click",
                connectWhatsApp
            );

            dom.connectTelegramBtn.addEventListener(
                "click",
                connectTelegram
            );

            electronAPI.onConnectionStatus(
                (status) => {

                    setConnectionStatus(
                        status
                    );

                    const connectionState =
                        getConnectionState(status);

                    if (connectionState !== "connected") {

                        whatsAppConnectedHandled =
                            false;
                    }

                    if (connectionState === "connected") {

                        handleWhatsAppConnected();
                    }
                }
            );

            electronAPI.onTelegramConnectionStatus(
                (status) => {

                    setTelegramConnectionStatus(
                        status
                    );

                    if (getConnectionState(status) === "connected") {

                        qrUI.hideTelegramQr();
                    }
                }
            );
        }

        return {
            formatConnectionElapsed,
            getConnectionState,
            register,
            setConnectionStatus,
            setTelegramConnectionStatus,
            setUnsafeControlsDisabled,
            updateConnectButton,
            updateTelegramConnectButton
        };
    }

    window.BroadcastRendererConnection = {
        createConnectionUI
    };
})();
