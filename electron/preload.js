const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
  "electronAPI",
  {
    selectMediaFile: () =>
      ipcRenderer.invoke(
        "select-media-file"
      ),

    selectContactsFile: () =>
      ipcRenderer.invoke(
        "select-contacts-file"
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

    onQRCode: (callback) =>
      ipcRenderer.on(
        "qr-code",
        (_, qr) => callback(qr)
      ),

    onConnectionStatus: (callback) =>
      ipcRenderer.on(
        "connection-status",
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

    loadLatestFailedContacts: () =>
      ipcRenderer.invoke(
        "load-latest-failed-contacts"
      ),
    
    loadSettings: () =>
      ipcRenderer.invoke(
        "load-settings"
      ),

    saveTemplate: (template) =>
      ipcRenderer.invoke(
        "save-template",
        template
      )
  }
);
