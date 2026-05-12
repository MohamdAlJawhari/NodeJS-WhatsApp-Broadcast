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
const fs = require("fs");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true
});

const {
  sendBroadcast
} = require("../src/sender");

const {
  generateMessage
} = require("../src/template");

const {
  loadContacts
} = require("../src/contacts");

const broadcastController =
  require("../src/broadcastController");

const {
  loadSettings,
  saveSettings
} = require("../src/settings");

let client = null;

const logsDir = path.join(
  __dirname,
  "..",
  "logs"
);

function ensureLogsDir() {

  if (!fs.existsSync(logsDir)) {

    fs.mkdirSync(logsDir, {
      recursive: true
    });
  }
}

function findLatestLogFile(prefix) {

  ensureLogsDir();

  const files = fs.readdirSync(logsDir)
    .filter(file => {
      return file.startsWith(`${prefix}-`) &&
        file.endsWith(".csv");
    })
    .map(file => {
      const filePath =
        path.join(logsDir, file);

      return {
        filePath,
        modifiedAt:
          fs.statSync(filePath).mtimeMs
      };
    })
    .sort((a, b) => {
      return b.modifiedAt - a.modifiedAt;
    });

  return files[0]?.filePath || null;
}

async function openLogLocation(kind) {

  const prefixes = {
    success: "success",
    failed: "failed"
  };

  const prefix = prefixes[kind];

  if (!prefix) {

    return {
      success: false,
      error: "Unknown log type"
    };
  }

  const logFile =
    findLatestLogFile(prefix);

  if (logFile) {

    shell.showItemInFolder(logFile);

    return {
      success: true,
      filePath: logFile
    };
  }

  ensureLogsDir();

  const error =
    await shell.openPath(logsDir);

  if (error) {

    return {
      success: false,
      error
    };
  }

  return {
    success: true,
    folderPath: logsDir
  };
}

function createWindow() {

  const win = new BrowserWindow({

    width: 1200,
    height: 800,

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

  createWindow();
});

// Open contacts file
ipcMain.handle(
  "select-contacts-file",
  async () => {

    const result =
      await dialog.showOpenDialog({

        properties: ["openFile"],

        filters: [
          {
            name: "Spreadsheet Files",

            extensions: [
              "xlsx",
              "xls",
              "csv"
            ]
          }
        ]
      });

    if (result.canceled) {

      return {
        success: false
      };
    }

    const filePath =
      result.filePaths[0];

    try {

      const contacts =
        loadContacts(filePath);

      return {
        success: true,
        filePath,
        count: contacts.length,
        contacts
      };

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }
);

// Generate preview messages
ipcMain.handle(
  "generate-preview",
  async (_, data) => {

    const {
      contacts,
      template,
      mediaFile
    } = data;

    const preview = contacts
      .slice(0, 5)
      .map(contact => {

        return {

          phone:
            contact[
            process.env.PHONE_COLUMN ||
            "phone"
            ],

          message:
            generateMessage(
              template,
              contact
            )
        };
      });

    return preview;
  }
);

// Select media file
ipcMain.handle(
  "select-media-file",
  async () => {

    const result =
      await dialog.showOpenDialog({

        properties: ["openFile"],

        filters: [
          {
            name: "Media Files",

            extensions: [
              "jpg",
              "jpeg",
              "png",
              "pdf",
              "mp4"
            ]
          }
        ]
      });

    if (result.canceled) {

      return {
        success: false
      };
    }

    return {
      success: true,
      filePath:
        result.filePaths[0]
    };
  }
);

// Connect to WhatsApp
ipcMain.handle(
  "connect-whatsapp",
  async (event) => {

    try {

      client =
        await wppconnect.create({

          session:
            "employee-session",

          headless: true,

          autoClose: 0,

          catchQR: (base64Qr) => {

            event.sender.send(
              "qr-code",
              base64Qr
            );
          },

          statusFind: (status) => {

            event.sender.send(
              "connection-status",
              status
            );
          }
        });

      event.sender.send(
        "connection-status",
        "CONNECTED"
      );

      return {
        success: true
      };

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }
);

// Pause broadcast
ipcMain.handle(
  "pause-broadcast",
  async () => {

    broadcastController.paused =
      true;

    return {
      success: true
    };
  }
);

// Resume broadcast
ipcMain.handle(
  "resume-broadcast",
  async () => {

    broadcastController.paused =
      false;

    return {
      success: true
    };
  }
);

// Stop broadcast
ipcMain.handle(
  "stop-broadcast",
  async () => {

    broadcastController.stopped =
      true;

    return {
      success: true
    };
  }
);

// Open latest success/failed log location
ipcMain.handle(
  "open-log-folder",
  async (_, kind) => {

    try {

      return await openLogLocation(kind);

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }
);

// Load latest failed contacts for retry
ipcMain.handle(
  "load-latest-failed-contacts",
  async () => {

    try {

      const failedFile =
        findLatestLogFile("failed");

      if (!failedFile) {

        return {
          success: false,
          error:
            "No failed contacts file found"
        };
      }

      const contacts =
        loadContacts(failedFile);

      return {
        success: true,
        filePath: failedFile,
        count: contacts.length,
        contacts
      };

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }
);

// Start broadcast
ipcMain.handle(
  "start-broadcast",
  async (event, data) => {

    try {

      if (!client) {

        return {
          success: false,
          error:
            "WhatsApp not connected"
        };
      }

      const {
        contacts,
        template,
        mediaFile
      } = data;

      // Progress callback
      const options = {

        template,

        mediaFile,

        delayMin: 10000,

        delayMax: 20000,

        batchSize: 5,

        batchPause: 30000,

        onProgress: (
          current,
          total
        ) => {

          const progress =
            (
              current / total
            ) * 100;

          event.sender.send(
            "broadcast-progress",
            progress
          );
        },

        onCountersUpdate: (
          counters
        ) => {

          event.sender.send(
            "broadcast-counters",
            counters
          );
        },
      };

      broadcastController.paused =
        false;

      broadcastController.stopped =
        false;

      // Live logger
      const originalLog =
        console.log;

      let broadcastResult;

      try {

        console.log = (...args) => {

          const message =
            args.join(" ");

          event.sender.send(
            "broadcast-log",
            message
          );

          originalLog(...args);
        };

        broadcastResult =
          await sendBroadcast(
            client,
            contacts,
            options
          );

      } finally {

        console.log = originalLog;
      }

      return {
        success: true,
        ...broadcastResult
      };

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }
);

// Load settings
ipcMain.handle(
  "load-settings",
  async () => {

    return loadSettings();
  }
);

// Save template
ipcMain.handle(
  "save-template",
  async (_, template) => {

    const settings =
      loadSettings();

    settings.defaultTemplate =
      template;

    saveSettings(settings);

    return {
      success: true
    };
  }
);
