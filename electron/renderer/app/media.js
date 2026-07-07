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
        }

        async function selectMediaFile() {

            const result =
                await electronAPI
                    .selectMediaFile();

            if (!result.success) {
                if (result.error) {
                    showToast(result.error, "error in selecting media file");
                }
                return;
            }

            setMediaFile(
                result.filePath
            );

            dom.mediaStatus.innerText =
                result.filePath;

            showToast(
                "Media file selected",
                "success"
            );

            await refreshValidationWarnings();
        }

        return {
            register,
            selectMediaFile
        };
    }

    window.BroadcastRendererMedia = {
        createMediaUI
    };
})();
