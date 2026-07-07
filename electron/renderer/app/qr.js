(function () {

    function createQrUI({
        dom,
        electronAPI,
        setTelegramConnectionStatus
    }) {

        function showWhatsAppQr(qr) {

            dom.qrImage.src =
                qr;

            dom.qrImage.style.display =
                "block";
        }

        function hideWhatsAppQr() {

            dom.qrImage.style.display =
                "none";
        }

        function showTelegramQr(qr) {

            dom.telegramQrImage.src =
                qr.qrDataUrl;

            dom.telegramLoginLink.href =
                qr.loginUrl;

            dom.telegramLoginLink.innerText =
                "Open Telegram login link";

            dom.telegramQrPanel.classList.remove(
                "hidden"
            );

            setTelegramConnectionStatus(
                "Scan Telegram QR"
            );
        }

        function hideTelegramQr() {

            dom.telegramQrPanel.classList.add(
                "hidden"
            );
        }

        function register() {

            electronAPI.onQRCode(
                showWhatsAppQr
            );

            electronAPI.onTelegramQRCode(
                showTelegramQr
            );
        }

        return {
            hideTelegramQr,
            hideWhatsAppQr,
            register,
            showTelegramQr,
            showWhatsAppQr
        };
    }

    window.BroadcastRendererQr = {
        createQrUI
    };
})();
