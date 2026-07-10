(function () {
    const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "mp4"];
    const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];

    function createMediaUI({ dom, electronAPI, setMediaFile, refreshValidationWarnings, showToast }) {
        function register() {
            dom.mediaBtn.addEventListener("click", selectMediaFile);
            if (dom.removeMediaBtn) dom.removeMediaBtn.addEventListener("click", removeMediaFile);
            if (dom.mediaDropZone) {
                dom.mediaDropZone.addEventListener("click", selectMediaFile);
                ["dragenter", "dragover"].forEach(eventName => {
                    dom.mediaDropZone.addEventListener(eventName, event => {
                        stopDropEvent(event);
                        dom.mediaDropZone.classList.add("is-dragging");
                    });
                });
                ["dragleave", "drop"].forEach(eventName => {
                    dom.mediaDropZone.addEventListener(eventName, event => {
                        stopDropEvent(event);
                        dom.mediaDropZone.classList.remove("is-dragging");
                    });
                });
                dom.mediaDropZone.addEventListener("drop", handleDrop);
                dom.mediaDropZone.addEventListener("keydown", event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectMediaFile();
                    }
                });
            }
            setState("empty");
        }

        async function selectMediaFile() {
            setState("processing");
            let result;
            try {
                result = await electronAPI.selectMediaFile();
            } catch (error) {
                showError(error.message || "Media file cannot be opened");
                return;
            }
            if (!result.success) {
                if (result.error) showError(result.error);
                else setState("empty");
                return;
            }
            await acceptFile(result.filePath, result.fileSize);
        }

        async function handleDrop(event) {
            const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
            if (!file) return;
            let filePath = file.path;
            if (electronAPI.getPathForFile) {
                try {
                    filePath = electronAPI.getPathForFile(file);
                } catch (_) {
                    filePath = file.path;
                }
            }
            if (!filePath) {
                showError("This dropped file could not be accessed. Please use Browse File.", file.name, file.size);
                return;
            }
            setState("processing", filePath, file.size);
            await acceptFile(filePath, file.size);
        }

        async function acceptFile(filePath, fileSize) {
            const extension = getExtension(filePath);
            if (!SUPPORTED_EXTENSIONS.includes(extension)) {
                setMediaFile(null);
                showError(`Unsupported file type: .${extension || "unknown"}`, filePath, fileSize);
                return;
            }
            setMediaFile(filePath);
            updateMediaDisplay(filePath, fileSize);
            setState("success", filePath, fileSize);
            showToast("Media file selected", "success");
            await refreshValidationWarnings();
        }

        async function removeMediaFile() {
            setMediaFile(null);
            updateMediaDisplay(null);
            setState("empty");
            showToast("Media file removed", "info");
            await refreshValidationWarnings();
        }

        function showError(message, filePath, fileSize) {
            updateMediaDisplay(filePath || null, fileSize);
            setState("error", filePath, fileSize, message);
            showToast(message, "error");
        }

        function setState(state, filePath, fileSize, errorMessage) {
            const labels = {
                empty: ["Upload your files", "File should be JPG, PNG, PDF, MP4"],
                processing: ["Processing file", "Checking your media..."],
                success: ["File ready", `${getTypeLabel(filePath)} ready for broadcast`],
                error: ["Upload failed", errorMessage || "The file could not be loaded"]
            };
            dom.mediaUploadCard.dataset.mediaState = state;
            ["empty", "processing", "success", "error"].forEach(name => {
                dom.mediaUploadCard.classList.toggle(`media-state-${name}`, name === state);
            });
            dom.mediaUploadTitle.innerText = labels[state][0];
            dom.mediaUploadHint.innerText = labels[state][1];
            if (dom.mediaDropPrompt) {
                dom.mediaDropPrompt.innerText = state === "success"
                    ? "Drop a file to replace it"
                    : "Drag & drop your file here";
            }
            if (dom.mediaProgressBar) dom.mediaProgressBar.style.width = state === "empty" ? "0%" : state === "processing" ? "55%" : "100%";
            if (dom.mediaProgressLabel) {
                dom.mediaProgressLabel.innerText = state === "success"
                    ? `${getTypeLabel(filePath)} ready - ${formatFileSize(fileSize)}`
                    : state === "processing" ? "Processing..." : state === "error" ? labels[state][1] : "";
            }
        }

        function updateMediaDisplay(filePath, fileSize) {
            const hasFile = Boolean(filePath);
            if (dom.mediaFileName) dom.mediaFileName.innerText = hasFile ? getFileName(filePath) : "No file selected";
            if (dom.mediaFileSize) dom.mediaFileSize.innerText = hasFile ? formatFileSize(fileSize) : "";
            dom.mediaStatus.innerText = hasFile
                ? `${IMAGE_EXTENSIONS.includes(getExtension(filePath)) ? "Image" : getTypeLabel(filePath)} ready to attach`
                : "No media selected";
            dom.mediaStatus.title = hasFile ? filePath : "";
            if (dom.removeMediaBtn) dom.removeMediaBtn.disabled = !hasFile;
            if (dom.mediaSelectedRow) dom.mediaSelectedRow.classList.toggle("hidden", !hasFile);
            updateThumbnail(filePath);
        }

        function updateThumbnail(filePath) {
            const extension = getExtension(filePath);
            const isImage = IMAGE_EXTENSIONS.includes(extension);
            const isVideo = extension === "mp4";
            const hasFile = Boolean(filePath);
            if (dom.mediaSelectedRow) {
                dom.mediaSelectedRow.classList.toggle("media-selected-image", isImage);
            }
            if (dom.mediaUploadCard) {
                dom.mediaUploadCard.classList.toggle("media-preview-image", isImage);
                dom.mediaUploadCard.classList.toggle("media-preview-file", hasFile && !isImage);
                dom.mediaUploadCard.classList.toggle("media-preview-video", hasFile && isVideo);
            }
            if (dom.mediaThumbnailImage) {
                dom.mediaThumbnailImage.classList.toggle("hidden", !isImage);
                if (isImage) dom.mediaThumbnailImage.src = pathToFileUrl(filePath);
                else dom.mediaThumbnailImage.removeAttribute("src");
            }
            if (dom.mediaCanvasFile) {
                dom.mediaCanvasFile.classList.toggle("hidden", !hasFile || isImage);
                dom.mediaCanvasFile.classList.toggle("media-canvas-video", isVideo);
                dom.mediaCanvasFile.classList.toggle("media-canvas-document", hasFile && !isImage && !isVideo);
                const videoIcon = dom.mediaCanvasFile.querySelector && dom.mediaCanvasFile.querySelector(".media-canvas-video-icon");
                const documentIcon = dom.mediaCanvasFile.querySelector && dom.mediaCanvasFile.querySelector(".media-canvas-document-icon");
                if (videoIcon) videoIcon.classList.toggle("hidden", !isVideo);
                if (documentIcon) documentIcon.classList.toggle("hidden", isVideo);
            }
            if (dom.mediaCanvasBadge) {
                dom.mediaCanvasBadge.innerText = getTypeLabel(filePath);
            }
            if (!dom.mediaThumbnail) return;
            dom.mediaThumbnail.classList.toggle("media-thumbnail-empty", !filePath);
            dom.mediaThumbnail.classList.toggle("media-thumbnail-photo", isImage);
            dom.mediaThumbnail.classList.toggle("media-thumbnail-file", Boolean(filePath) && !isImage);
            if (dom.mediaThumbnailIcon) dom.mediaThumbnailIcon.classList.toggle("hidden", isImage);
            if (dom.mediaThumbnailBadge) {
                dom.mediaThumbnailBadge.innerText = extension.toUpperCase();
                dom.mediaThumbnailBadge.classList.toggle("hidden", !filePath || isImage);
            }
        }

        return { removeMediaFile, register, selectMediaFile };
    }

    function stopDropEvent(event) { event.preventDefault(); event.stopPropagation(); }
    function getFileName(filePath) { return String(filePath || "").split(/[\\/]/).filter(Boolean).pop() || "Media file"; }
    function getExtension(filePath) { const match = getFileName(filePath).match(/\.([^.]+)$/); return match ? match[1].toLowerCase() : ""; }
    function getTypeLabel(filePath) { const extension = getExtension(filePath); return extension === "jpeg" ? "JPG" : extension.toUpperCase() || "File"; }
    function formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) return "Size unavailable";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / (1024 * 1024) * 10) / 10} MB`;
    }
    function pathToFileUrl(filePath) {
        const normalized = String(filePath).replace(/\\/g, "/");
        const prefixed = normalized.startsWith("/") ? normalized : `/${normalized}`;
        return `file://${prefixed.split("/").map((part, index) => index === 1 && /^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part)).join("/")}`;
    }

    window.BroadcastRendererMedia = { createMediaUI };
})();
