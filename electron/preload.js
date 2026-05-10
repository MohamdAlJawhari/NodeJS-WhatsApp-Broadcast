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
      )
  }
);