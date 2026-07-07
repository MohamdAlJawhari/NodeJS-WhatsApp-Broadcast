(function () {

    function createNavigationUI({
        dom,
        getContactFilesUI
    }) {

        async function showPage(
            page
        ) {

            dom.mainPage.classList.toggle(
                "hidden",
                page !== "sender"
            );

            dom.contactsPage.classList.toggle(
                "hidden",
                page !== "contacts"
            );

            dom.contactEditorPage.classList.toggle(
                "hidden",
                page !== "editor"
            );

            dom.senderNavBtn.classList.toggle(
                "active",
                page === "sender"
            );

            dom.contactsNavBtn.classList.toggle(
                "active",
                page === "contacts" ||
                page === "editor"
            );

            if (page === "contacts") {

                const contactFilesUI =
                    getContactFilesUI();

                if (contactFilesUI) {

                    await contactFilesUI.loadSavedContactFiles();
                }
            }
        }

        function register() {

            dom.senderNavBtn.addEventListener(
                "click",
                () => {
                    showPage("sender");
                }
            );

            dom.contactsNavBtn.addEventListener(
                "click",
                async () => {
                    await showPage("contacts");
                }
            );

            dom.contactsBackToSenderBtn.addEventListener(
                "click",
                () => {
                    showPage("sender");
                }
            );
        }

        return {
            register,
            showPage
        };
    }

    window.BroadcastRendererNavigation = {
        createNavigationUI
    };
})();
