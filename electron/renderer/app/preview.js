(function () {

    function createPreviewUI({
        dom,
        electronAPI,
        getContacts,
        getTemplate,
        getMediaFile,
        getSelectedProvider,
        showToast
    }) {

        function register() {

            dom.previewBtn.addEventListener(
                "click",
                previewMessages
            );
        }

        async function previewMessages() {

            const contacts =
                getContacts();

            if (contacts.length === 0) {

                showToast(
                    "Add or select contacts first",
                    "warning"
                );

                return;
            }

            const preview =
                await electronAPI
                    .generatePreview({

                        contacts,
                        template:
                            getTemplate(),
                        mediaFile:
                            getMediaFile(),
                        provider:
                            getSelectedProvider()
                    });

            renderPreview(
                preview
            );
        }

        function renderPreview(
            preview
        ) {

            dom.previewContainer.innerHTML =
                "";

            preview.forEach(item => {

                const div =
                    document.createElement("div");

                div.className =
                    "preview-card";

                const phone =
                    document.createElement("strong");

                phone.dir =
                    "ltr";

                phone.innerText =
                    item.phone;

                const message =
                    document.createElement("p");

                message.dir =
                    "auto";

                message.innerText =
                    item.message;

                div.append(
                    phone,
                    message
                );

                dom.previewContainer.appendChild(
                    div
                );
            });
        }

        return {
            previewMessages,
            register,
            renderPreview
        };
    }

    window.BroadcastRendererPreview = {
        createPreviewUI
    };
})();
