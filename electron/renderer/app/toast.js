(function () {

    function createToast({
        toastContainer
    }) {

        return function showToast(
            message,
            type = "info"
        ) {

            const toast =
                document.createElement("div");

            toast.className =
                `toast toast-${type}`;

            toast.innerText =
                message;

            toast.addEventListener(
                "click",
                () => {
                    toast.remove();
                }
            );

            toastContainer.appendChild(
                toast
            );

            setTimeout(
                () => {
                    toast.classList.add(
                        "toast-hide"
                    );

                    setTimeout(
                        () => {
                            toast.remove();
                        },
                        200
                    );
                },
                4500
            );
        };
    }

    window.BroadcastRendererToast = {
        createToast
    };
})();
