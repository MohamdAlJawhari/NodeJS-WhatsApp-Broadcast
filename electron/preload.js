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
      )
  }
);