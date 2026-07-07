const wppconnect =
  require("@wppconnect-team/wppconnect");

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell
} = require("electron");

const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true
});

const {
  createContactFileService
} = require("./contactFiles");

const {
  createRuntimePaths
} = require("./main/runtimePaths");

const {
  createSettingsService
} = require("./main/settingsService");

const {
  createLogService
} = require("./main/logService");

const {
  createWhatsAppConnectionService
} = require("./main/whatsappConnection");

const {
  createTelegramConnectionService
} = require("./main/telegramConnection");

const {
  createBroadcastOrchestrator
} = require("./main/broadcastOrchestrator");

const {
  registerIpcHandlers
} = require("./main/ipcHandlers");

const appRootDir = path.join(
  __dirname,
  ".."
);

const runtimePaths =
  createRuntimePaths({
    app,
    appRootDir
  });

const settingsService =
  createSettingsService({
    runtimePaths
  });

const logService =
  createLogService({
    runtimePaths,
    shell
  });

const contactFiles =
  createContactFileService({
    app,
    dialog,
    shell
  });

const whatsappConnection =
  createWhatsAppConnectionService({
    app,
    runtimePaths,
    settingsService,
    wppconnect
  });

const telegramConnection =
  createTelegramConnectionService();

const broadcastOrchestrator =
  createBroadcastOrchestrator({
    runtimePaths,
    settingsService,
    whatsappConnection,
    telegramConnection
  });

registerIpcHandlers({
  ipcMain,
  dialog,
  contactFiles,
  whatsappConnection,
  telegramConnection,
  broadcastOrchestrator,
  logService,
  settingsService
});

function createWindow() {

  const win = new BrowserWindow({

    width: 1200,
    height: 800,
    icon:
      path.join(
        __dirname,
        "..",
        "build",
        "icon.ico"
      ),

    webPreferences: {

      preload: path.join(
        __dirname,
        "preload.js"
      )
    }
  });

  win.loadFile(
    path.join(
      __dirname,
      "renderer",
      "index.html"
    )
  );
}

app.whenReady().then(() => {

  settingsService.configureRuntimePaths();

  createWindow();
});
