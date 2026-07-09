(function () {

    const logKinds = [
        {
            kind: "success",
            label: "success"
        },
        {
            kind: "failed",
            label: "failed"
        },
        {
            kind: "failedRetry",
            label: "retry"
        },
        {
            kind: "send",
            label: "send"
        }
    ];

    function createLogsUI({
        dom,
        electronAPI,
        showToast,
        confirmAction = window.confirm
    }) {

        function register() {

            dom.openSuccessLogsBtn.addEventListener(
                "click",
                async () => {

                    await openLogFolder(
                        "success"
                    );
                }
            );

            dom.openFailedLogsBtn.addEventListener(
                "click",
                async () => {

                    await openLogFolder(
                        "failed"
                    );
                }
            );

            dom.cleanAllLogsBtn.addEventListener(
                "click",
                async () => {

                    await cleanAllLogFiles();
                }
            );

            electronAPI.onBroadcastLog(
                appendLogLine
            );
        }

        function appendLogLine(
            message
        ) {

            const div =
                document.createElement("div");

            div.className =
                `log-line ${getLogLevelClass(message)}`;

            const time =
                document.createElement("span");

            time.className =
                "log-time";

            time.innerText =
                new Date()
                    .toLocaleTimeString(
                        [],
                        {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                        }
                    );

            const body =
                document.createElement("span");

            body.className =
                "log-message";

            body.innerText =
                message;

            div.append(
                time,
                body
            );

            dom.logs.appendChild(div);

            dom.logs.scrollTop =
                dom.logs.scrollHeight;
        }

        function clearLogs() {

            dom.logs.innerHTML =
                "";
        }

        function getLogLevelClass(
            message
        ) {

            const normalized =
                String(message || "")
                    .toLowerCase();

            if (
                normalized.includes("failed") ||
                normalized.includes("error")
            ) {

                return "log-error";
            }

            if (
                normalized.includes("skipped") ||
                normalized.includes("waiting") ||
                normalized.includes("retry")
            ) {

                return "log-warning";
            }

            if (
                normalized.includes("success") ||
                normalized.includes("finished") ||
                normalized.includes("completed")
            ) {

                return "log-success";
            }

            return "log-info";
        }

        async function openLogFolder(
            kind
        ) {

            const result =
                await electronAPI
                    .openLogFolder(kind);

            if (!result.success) {

                showToast(
                    result.error ||
                    "Could not open logs folder",
                    "error"
                );

                return;
            }

            showToast(
                "Logs folder opened",
                "success"
            );
        }

        async function cleanAllLogFiles() {

            const confirmed =
                confirmAction(
                    "Delete all saved success, failed, retry, and send logs?"
                );

            if (!confirmed) {

                return;
            }

            let deletedCount = 0;

            const failedLabels = [];

            for (const logKind of logKinds) {

                const result =
                    await electronAPI
                        .cleanLogFiles(logKind.kind);

                if (result.success) {

                    deletedCount +=
                        result.deletedCount || 0;

                } else {

                    failedLabels.push(
                        logKind.label
                    );
                }
            }

            if (failedLabels.length > 0) {

                showToast(
                    `Could not clean ${failedLabels.join(", ")} logs`,
                    "error"
                );

                if (deletedCount === 0) {

                    return;
                }
            }

            showToast(
                `Deleted ${deletedCount} log file(s)`,
                "success"
            );
        }

        return {
            appendLogLine,
            cleanAllLogFiles,
            clearLogs,
            openLogFolder,
            register
        };
    }

    window.BroadcastRendererLogs = {
        createLogsUI
    };
})();
