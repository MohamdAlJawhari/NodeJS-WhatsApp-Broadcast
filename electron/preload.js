const {
  contextBridge,
  ipcRenderer,
  webUtils
} = require("electron");

contextBridge.exposeInMainWorld(
  "electronAPI",
  {
    getPathForFile: (file) =>
      webUtils.getPathForFile(file),

    selectMediaFile: () =>
      ipcRenderer.invoke(
        "select-media-file"
      ),

    selectContactsFile: (options) =>
      ipcRenderer.invoke(
        "select-contacts-file",
        options
      ),

    listSavedContactFiles: () =>
      ipcRenderer.invoke(
        "list-saved-contact-files"
      ),

    loadSavedContactFile: (id) =>
      ipcRenderer.invoke(
        "load-saved-contact-file",
        id
      ),

    openSavedContactsFolder: () =>
      ipcRenderer.invoke(
        "open-saved-contacts-folder"
      ),

    getSavedContactDetails: (id) =>
      ipcRenderer.invoke(
        "get-saved-contact-details",
        id
      ),

    saveSavedContactDetails: (data) =>
      ipcRenderer.invoke(
        "save-saved-contact-details",
        data
      ),

    saveSavedContactContent: (data) =>
      ipcRenderer.invoke(
        "save-saved-contact-content",
        data
      ),

    setSavedContactCategory: (data) =>
      ipcRenderer.invoke(
        "set-saved-contact-category",
        data
      ),

    deleteSavedContactFile: (id) =>
      ipcRenderer.invoke(
        "delete-saved-contact-file",
        id
      ),

    exportSavedContactFile: (id) =>
      ipcRenderer.invoke(
        "export-saved-contact-file",
        id
      ),

    generatePreview: (data) =>
      ipcRenderer.invoke(
        "generate-preview",
        data
      ),

    connectWhatsApp: () =>
      ipcRenderer.invoke(
        "connect-whatsapp"
      ),

    connectTelegram: () =>
      ipcRenderer.invoke(
        "connect-telegram"
      ),

    onQRCode: (callback) =>
      ipcRenderer.on(
        "qr-code",
        (_, qr) => callback(qr)
      ),

    onTelegramQRCode: (callback) =>
      ipcRenderer.on(
        "telegram-qr-code",
        (_, qr) => callback(qr)
      ),

    onConnectionStatus: (callback) =>
      ipcRenderer.on(
        "connection-status",
        (_, status) => callback(status)
      ),

    onTelegramConnectionStatus: (callback) =>
      ipcRenderer.on(
        "telegram-connection-status",
        (_, status) => callback(status)
      ),

    pauseBroadcast: () =>
      ipcRenderer.invoke(
        "pause-broadcast"
      ),

    resumeBroadcast: () =>
      ipcRenderer.invoke(
        "resume-broadcast"
      ),

    stopBroadcast: () =>
      ipcRenderer.invoke(
        "stop-broadcast"
      ),

    startBroadcast: (data) =>
      ipcRenderer.invoke(
        "start-broadcast",
        data
      ),

    onBroadcastLog: (callback) =>
      ipcRenderer.on(
        "broadcast-log",
        (_, message) =>
          callback(message)
      ),

    onBroadcastProgress: (callback) =>
      ipcRenderer.on(
        "broadcast-progress",
        (_, progress) =>
          callback(progress)
      ),

    onBroadcastCounters: (callback) =>
      ipcRenderer.on(
        "broadcast-counters",
        (_, counters) =>
          callback(counters)
      ),

    openLogFolder: (kind) =>
      ipcRenderer.invoke(
        "open-log-folder",
        kind
      ),

    cleanLogFiles: (kind) =>
      ipcRenderer.invoke(
        "clean-log-files",
        kind
      ),

    loadLatestFailedContacts: () =>
      ipcRenderer.invoke(
        "load-latest-failed-contacts"
      ),

    validateBroadcastInput: (data) =>
      ipcRenderer.invoke(
        "validate-broadcast-input",
        data
      ),
    
    loadSettings: () =>
      ipcRenderer.invoke(
        "load-settings"
      ),

    saveTemplate: (template, provider) =>
      ipcRenderer.invoke(
        "save-template",
        {
          provider,
          template
        }
      ),

    getUpdateStatus: () =>
      ipcRenderer.invoke(
        "get-update-status"
      ),

    checkForUpdates: () =>
      ipcRenderer.invoke(
        "check-for-updates"
      ),

    downloadUpdate: () =>
      ipcRenderer.invoke(
        "download-update"
      ),

    installUpdate: (options) =>
      ipcRenderer.invoke(
        "install-update",
        options
      ),

    onUpdateStatus: (callback) =>
      ipcRenderer.on(
        "update-status",
        (_, status) =>
          callback(status)
      ),

    onUpdateProgress: (callback) =>
      ipcRenderer.on(
        "update-progress",
        (_, progress) =>
          callback(progress)
      ),

    onUpdateAvailable: (callback) =>
      ipcRenderer.on(
        "update-available",
        (_, updateInfo) =>
          callback(updateInfo)
      ),

    onUpdateDownloaded: (callback) =>
      ipcRenderer.on(
        "update-downloaded",
        (_, updateInfo) =>
          callback(updateInfo)
      ),

    onUpdateError: (callback) =>
      ipcRenderer.on(
        "update-error",
        (_, error) =>
          callback(error)
      )
  }
);
