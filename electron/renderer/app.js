const connectBtn =
    document.getElementById(
        "connectBtn"
    );

const qrImage =
    document.getElementById(
        "qrImage"
    );

const connectionStatus =
    document.getElementById(
        "connectionStatus"
    );

const loadBtn =
    document.getElementById(
        "loadContactsBtn"
    );

const status =
    document.getElementById(
        "status"
    );

const previewBtn =
    document.getElementById(
        "previewBtn"
    );

const templateInput =
    document.getElementById(
        "templateInput"
    );

const previewContainer =
    document.getElementById(
        "previewContainer"
    );

const startBtn =
    document.getElementById(
        "startBtn"
    );

const logs =
    document.getElementById(
        "logs"
    );

const progressBar =
    document.getElementById(
        "progressBar"
    );

const progressText =
    document.getElementById(
        "progressText"
    );

const mediaBtn =
    document.getElementById(
        "mediaBtn"
    );

const mediaStatus =
    document.getElementById(
        "mediaStatus"
    );

const pauseBtn =
    document.getElementById(
        "pauseBtn"
    );

const resumeBtn =
    document.getElementById(
        "resumeBtn"
    );

const stopBtn =
    document.getElementById(
        "stopBtn"
    );

const saveTemplateBtn =
    document.getElementById(
        "saveTemplateBtn"
    );

const broadcastStatus =
    document.getElementById(
        "broadcastStatus"
    );

let contacts = [];

let mediaFile = null;

loadBtn.addEventListener(
    "click",
    async () => {

        status.innerText =
            "Loading contacts...";

        const result =
            await window.electronAPI
                .selectContactsFile();

        if (!result.success) {

            status.innerText =
                result.error ||
                "File selection canceled";

            return;
        }

        contacts = result.contacts;

        status.innerText =
            `Loaded ${result.count} contacts`;
    }
);

previewBtn.addEventListener(
    "click",
    async () => {

        if (contacts.length === 0) {

            alert(
                "Load contacts first"
            );

            return;
        }

        const template =
            templateInput.value;

        const preview =
            await window.electronAPI
                .generatePreview({

                    contacts,
                    template,
                    mediaFile
                });

        previewContainer.innerHTML =
            "";

        preview.forEach(item => {

            const div =
                document.createElement("div");

            div.className =
                "preview-card";

            div.innerHTML = `
        <strong>
          ${item.phone}
        </strong>

        <p>
          ${item.message}
        </p>
      `;

            previewContainer.appendChild(
                div
            );
        });
    }
);

mediaBtn.addEventListener(
    "click",
    async () => {

        const result =
            await window.electronAPI
                .selectMediaFile();

        if (!result.success) {

            return;
        }

        mediaFile =
            result.filePath;

        mediaStatus.innerText =
            mediaFile;
    }
);

connectBtn.addEventListener(
    "click",
    async () => {

        connectionStatus.innerText =
            "Connecting...";

        const result =
            await window.electronAPI
                .connectWhatsApp();

        if (!result.success) {

            connectionStatus.innerText =
                result.error;
        }
    }
);

window.electronAPI.onQRCode(
    (qr) => {

        qrImage.src = qr;

        qrImage.style.display =
            "block";
    }
);

window.electronAPI
    .onConnectionStatus(
        (status) => {

            connectionStatus.innerText =
                status;

            if (
                status === "CONNECTED"
            ) {

                qrImage.style.display =
                    "none";
            }
        }
    );

startBtn.addEventListener(
    "click",
    async () => {

        if (contacts.length === 0) {

            alert(
                "Load contacts first"
            );

            return;
        }

        const template =
            templateInput.value;

        logs.innerHTML = "";

        progressBar.value = 0;

        progressText.innerText =
            "0%";

        setBroadcastStatus(
            "RUNNING"
        );

        updateButtons(
            "RUNNING"
        );

        const result =
            await window.electronAPI
                .startBroadcast({

                    contacts,
                    template,
                    mediaFile
                });

        if (!result.success) {

            alert(result.error);
        } else {

            setBroadcastStatus(
                "COMPLETED"
            );

            updateButtons(
                "COMPLETED"
            );
        }
    }
);

pauseBtn.addEventListener(
    "click",
    async () => {

        await window.electronAPI
            .pauseBroadcast();

        setBroadcastStatus(
            "PAUSED"
        );

        updateButtons(
            "PAUSED"
        );
    }
);

resumeBtn.addEventListener(
    "click",
    async () => {

        await window.electronAPI
            .resumeBroadcast();

        setBroadcastStatus(
            "RUNNING"
        );

        updateButtons(
            "RUNNING"
        );
    }
);

stopBtn.addEventListener(
    "click",
    async () => {

        await window.electronAPI
            .stopBroadcast();

        setBroadcastStatus(
            "STOPPED"
        );

        updateButtons(
            "STOPPED"
        );
    }
);

window.electronAPI
    .onBroadcastLog(
        (message) => {

            const div =
                document.createElement("div");

            div.className =
                "log-line";

            div.innerText =
                message;

            logs.appendChild(div);

            logs.scrollTop =
                logs.scrollHeight;
        }
    );

window.electronAPI
    .onBroadcastProgress(
        (progress) => {

            progressBar.value =
                progress;

            progressText.innerText =
                `${progress.toFixed(1)}%`;
        }
    );

saveTemplateBtn
    .addEventListener(
        "click",
        async () => {

            const template =
                templateInput.value;

            await window
                .electronAPI
                .saveTemplate(
                    template
                );

            alert(
                "Default template saved"
            );
        }
    );

async function loadAppSettings() {

    const settings =
        await window.electronAPI
            .loadSettings();

    templateInput.value =
        settings.defaultTemplate;
}

function setBroadcastStatus(
    status
) {

    broadcastStatus.innerText =
        status;

    broadcastStatus.className =
        "";

    broadcastStatus.classList.add(
        `status-${status.toLowerCase()}`
    );
}

function updateButtons(
    state
) {

    if (state === "IDLE") {

        startBtn.disabled =
            false;

        pauseBtn.disabled =
            true;

        resumeBtn.disabled =
            true;

        stopBtn.disabled =
            true;
    }

    if (state === "RUNNING") {

        startBtn.disabled =
            true;

        pauseBtn.disabled =
            false;

        resumeBtn.disabled =
            true;

        stopBtn.disabled =
            false;
    }

    if (state === "PAUSED") {

        startBtn.disabled =
            true;

        pauseBtn.disabled =
            true;

        resumeBtn.disabled =
            false;

        stopBtn.disabled =
            false;
    }

    if (
        state === "STOPPED" ||
        state === "COMPLETED"
    ) {

        startBtn.disabled =
            false;

        pauseBtn.disabled =
            true;

        resumeBtn.disabled =
            true;

        stopBtn.disabled =
            true;
    }
}

loadAppSettings();
setBroadcastStatus("IDLE");
updateButtons("IDLE");