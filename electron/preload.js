const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
  "electronAPI",
  {

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
      )
  }
);