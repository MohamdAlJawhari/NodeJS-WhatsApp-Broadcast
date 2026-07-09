(function () {

    function createMediaUI({
        dom,
        electronAPI,
        setMediaFile,
        refreshValidationWarnings,
        showToast
    }) {

        function register() {

            dom.mediaBtn.addEventListener(
                "click",
                selectMediaFile
            );

            if (dom.removeMediaBtn) {

                dom.removeMediaBtn.addEventListener(
                    "click",
                    removeMediaFile
                );
            }
        }

        async function selectMediaFile() {

            const result =
                await electronAPI
                    .selectMediaFile();

            if (!result.success) {
                if (result.error) {
                    showToast(result.error, "error");
                }
                return;
            }

            setMediaFile(
                result.filePath
            );

            updateMediaDisplay(
                result.filePath
            );

            showToast(
                "Media file selected",
                "success"
            );

            await refreshValidationWarnings();
        }

        async function removeMediaFile() {

            setMediaFile(
                null
            );

            updateMediaDisplay(
                null
            );

            showToast(
                "Media file removed",
                "info"
            );

            await refreshValidationWarnings();
        }

        function updateMediaDisplay(
            filePath
        ) {

            if (dom.mediaFileName) {

                dom.mediaFileName.innerText =
                    filePath
                        ? getFileName(filePath)
                        : "No file selected";
            }

            dom.mediaStatus.innerText =
                filePath ||
                "No media selected";

            if (dom.removeMediaBtn) {

                dom.removeMediaBtn.disabled =
                    !filePath;
            }
        }

        function getFileName(
            filePath
        ) {

            return String(filePath || "")
                .split(/[\\/]/)
                .filter(Boolean)
                .pop() ||
                "Media file";
        }

        return {
            removeMediaFile,
            register,
            selectMediaFile
        };
    }

    window.BroadcastRendererMedia = {
        createMediaUI
    };
})();
