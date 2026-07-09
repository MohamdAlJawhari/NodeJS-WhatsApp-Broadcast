(function () {

    const validationWarningPreviewLimit = 5;

    function createValidationUI({
        dom,
        electronAPI,
        getSelectedProvider,
        getContacts,
        getTemplate,
        getMediaFile
    }) {

        let validationRequestId = 0;
        let validationTimer = null;
        let validationWarningsExpanded = false;
        let currentValidationResult = null;

        function register() {

            dom.templateInput.addEventListener(
                "input",
                () => {
                    scheduleRefresh();
                }
            );

            if (dom.validateBtn) {

                dom.validateBtn.addEventListener(
                    "click",
                    async () => {
                        clearTimer();
                        await refresh();
                    }
                );
            }
        }

        function scheduleRefresh() {

            clearTimeout(validationTimer);

            validationTimer =
                setTimeout(
                    () => {
                        refresh();
                    },
                    300
                );
        }

        function clearTimer() {

            clearTimeout(validationTimer);
        }

        async function refresh(
            targetContacts = getContacts()
        ) {

            const requestId =
                ++validationRequestId;

            try {

                const result =
                    await electronAPI
                        .validateBroadcastInput({

                            provider:
                                getSelectedProvider(),
                            contacts:
                                targetContacts,
                            template:
                                getTemplate(),
                            mediaFile:
                                getMediaFile()
                        });

                if (
                    requestId !==
                    validationRequestId
                ) {

                    return null;
                }

                render(
                    result
                );

                return result;

            } catch (error) {

                if (requestId !== validationRequestId) {
                    return null;
                }

                const result = {
                    valid: false,
                    warnings: [
                        {
                            type: "error",
                            title: "Validation failed",
                            message: error.message
                        }
                    ],
                    summary: {
                        provider:
                            getSelectedProvider(),
                        totalContacts:
                            targetContacts.length,
                        validPhones: 0,
                        invalidPhones: 0,
                        duplicatePhones: 0
                    }
                };

                render(
                    result
                );

                return result;
            }
        }

        function render(
            result
        ) {

            currentValidationResult =
                result;

            const warnings =
                result.warnings || [];

            const summary =
                result.summary || {
                    provider:
                        getSelectedProvider(),
                    totalContacts: 0,
                    validPhones: 0,
                    invalidPhones: 0,
                    duplicatePhones: 0
                };

            dom.validationWarnings.innerHTML =
                "";

            dom.validationPanel.className =
                "validation-panel";

            if (warnings.length === 0) {

                dom.validationPanel.classList.add(
                    "validation-panel-empty"
                );

                dom.validationSummary.innerText =
                    summary.totalContacts > 0
                        ? `${summary.totalContacts} contacts ready`
                        : "No contacts loaded";

                return;
            }

            const recipientLabel =
                summary.provider === "telegram"
                    ? "recipients"
                    : "phones";

            const validRecipients =
                summary.validRecipients ??
                summary.validPhones;

            const invalidRecipients =
                summary.invalidRecipients ??
                summary.invalidPhones;

            const duplicateRecipients =
                summary.duplicateRecipients ??
                summary.duplicatePhones;

            if (
                warnings.some(warning => {
                    return warning.type === "error";
                })
            ) {

                dom.validationPanel.classList.add(
                    "validation-panel-error"
                );

            } else {

                dom.validationPanel.classList.add(
                    "validation-panel-warning"
                );
            }

            dom.validationSummary.innerText =
                `${summary.totalContacts} contacts, ${validRecipients} valid ${recipientLabel}, ${invalidRecipients} invalid, ${duplicateRecipients} duplicate`;

            warnings.forEach(warning => {

                const item =
                    document.createElement("li");

                item.className =
                    `validation-item validation-${warning.type}`;

                const title =
                    document.createElement("strong");

                title.innerText =
                    warning.title;

                const message =
                    document.createElement("p");

                message.innerText =
                    warning.message;

                item.appendChild(title);
                item.appendChild(message);

                if (
                    warning.details &&
                    warning.details.length > 0
                ) {

                    const details =
                        document.createElement("ul");

                    details.className =
                        "validation-details";

                    const visibleDetails =
                        validationWarningsExpanded
                            ? warning.details
                            : warning.details.slice(
                                0,
                                validationWarningPreviewLimit
                            );

                    visibleDetails.forEach(detail => {

                        const detailItem =
                            document.createElement("li");

                        detailItem.innerText =
                            detail;

                        details.appendChild(
                            detailItem
                        );
                    });

                    item.appendChild(details);
                }

                dom.validationWarnings.appendChild(
                    item
                );
            });

            if (hasHiddenWarnings(warnings)) {

                const toggleItem =
                    document.createElement("li");

                toggleItem.className =
                    "validation-toggle-item";

                const toggleButton =
                    document.createElement("button");

                toggleButton.type =
                    "button";

                toggleButton.className =
                    "validation-toggle";

                toggleButton.innerText =
                    validationWarningsExpanded
                        ? "Show fewer warnings"
                        : `Show all warnings (${getExpandableWarningCount(warnings)})`;

                toggleButton.addEventListener(
                    "click",
                    () => {

                        validationWarningsExpanded =
                            !validationWarningsExpanded;

                        render(
                            currentValidationResult
                        );
                    }
                );

                toggleItem.appendChild(
                    toggleButton
                );

                dom.validationWarnings.appendChild(
                    toggleItem
                );
            }
        }

        function resetWarningDisplay() {

            validationWarningsExpanded =
                false;
        }

        function hasHiddenWarnings(
            warnings
        ) {

            return warnings.some(warning => {

                return (
                    warning.details &&
                    warning.details.length >
                        validationWarningPreviewLimit
                );
            });
        }

        function getExpandableWarningCount(
            warnings
        ) {

            return warnings.reduce(
                (total, warning) => {

                    if (
                        warning.details &&
                        warning.details.length >
                            validationWarningPreviewLimit
                    ) {

                        return total +
                            warning.details.length;
                    }

                    return total;
                },
                0
            );
        }

        return {
            clearTimer,
            refresh,
            register,
            render,
            resetWarningDisplay
        };
    }

    window.BroadcastRendererValidation = {
        createValidationUI
    };
})();
