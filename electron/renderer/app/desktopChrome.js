(function () {

    function createDesktopChrome({
        dom
    }) {

        let timeTimerId = null;

        function register() {

            observeText(
                dom.connectionStatus,
                syncConnectionChrome
            );

            observeText(
                dom.telegramConnectionStatus,
                syncConnectionChrome
            );

            observeText(
                dom.status,
                syncContactsChrome
            );

            observeText(
                dom.contactsCount,
                syncContactsChrome
            );

            observeText(
                dom.broadcastStatus,
                syncBroadcastChrome
            );

            if (dom.statusBarTime) {

                updateTime();

                timeTimerId =
                    setInterval(
                        updateTime,
                        30000
                    );
            }

            syncConnectionChrome();
            syncContactsChrome();
            syncBroadcastChrome();
        }

        function observeText(
            element,
            callback
        ) {

            if (!element) {

                return;
            }

            const observer =
                new MutationObserver(callback);

            observer.observe(
                element,
                {
                    childList: true,
                    characterData: true,
                    subtree: true
                }
            );
        }

        function syncConnectionChrome() {

            const whatsAppText =
                dom.connectionStatus
                    ? dom.connectionStatus.innerText
                    : "Not connected";

            const telegramText =
                dom.telegramConnectionStatus
                    ? dom.telegramConnectionStatus.innerText
                    : "Telegram not connected";

            const whatsAppState =
                getConnectionState(whatsAppText);

            const telegramState =
                getConnectionState(telegramText);

            updateBadge(
                dom.headerWhatsAppBadge,
                dom.headerWhatsAppStatus,
                whatsAppState
            );

            updateBadge(
                dom.headerTelegramBadge,
                dom.headerTelegramStatus,
                telegramState
            );

            if (dom.statusBarConnection) {

                dom.statusBarConnection.innerText =
                    `WhatsApp ${getConnectionLabel(whatsAppState)}`;
            }
        }

        function updateBadge(
            badge,
            label,
            state
        ) {

            if (badge) {

                badge.dataset.state =
                    state;
            }

            if (label) {

                label.innerText =
                    getConnectionLabel(state);
            }
        }

        function getConnectionState(
            text
        ) {

            const normalized =
                String(text || "")
                    .trim()
                    .toLowerCase();

            if (
                !normalized ||
                normalized.includes("not connected") ||
                normalized.includes("not_connected") ||
                normalized.includes("notconnected") ||
                normalized.includes("not logged") ||
                normalized.includes("offline")
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

        function getConnectionLabel(
            state
        ) {

            if (state === "connected") {

                return "Connected";
            }

            if (state === "connecting") {

                return "Connecting";
            }

            if (state === "error") {

                return "Issue";
            }

            return "Offline";
        }

        function syncContactsChrome() {

            if (!dom.statusBarContacts) {

                return;
            }

            const countText =
                dom.contactsCount
                    ? dom.contactsCount.innerText
                    : "";

            const count =
                getFirstNumber(countText);

            dom.statusBarContacts.innerText =
                `${count} Contacts Loaded`;
        }

        function syncBroadcastChrome() {

            if (!dom.statusBarReady) {

                return;
            }

            const status =
                dom.broadcastStatus
                    ? dom.broadcastStatus.innerText
                    : "Ready";

            dom.statusBarReady.innerText =
                status === "Ready"
                    ? "Ready to Send"
                    : status;
        }

        function getFirstNumber(
            text
        ) {

            const match =
                String(text || "")
                    .match(/\d+/);

            return match
                ? match[0]
                : "0";
        }

        function updateTime() {

            if (!dom.statusBarTime) {

                return;
            }

            dom.statusBarTime.innerText =
                new Date()
                    .toLocaleTimeString(
                        [],
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );
        }

        return {
            register,
            updateTime,
            stop: () => {
                clearInterval(
                    timeTimerId
                );
            }
        };
    }

    window.BroadcastRendererDesktopChrome = {
        createDesktopChrome
    };
})();
