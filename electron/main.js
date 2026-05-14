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
const crypto = require("crypto");

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

const {
  validatePhone,
  validateTemplateVariables
} = require("../src/validator");

const {
  validateMediaFile
} = require("../src/media");

const broadcastController =
  require("../src/broadcastController");

const {
  loadSettings,
  saveSettings
} = require("../src/settings");

let client = null;

const appRootDir = path.join(
  __dirname,
  ".."
);

function getWritableRootDir() {

  if (app.isPackaged) {

    return app.getPath("userData");
  }

  return appRootDir;
}

function getLogsDir() {

  return path.join(
    getWritableRootDir(),
    "logs"
  );
}

function getSavedContactsDir() {

  return path.join(
    getWritableRootDir(),
    "data",
    "saved-contacts"
  );
}

function ensureDirectory(dirPath) {

  if (!fs.existsSync(dirPath)) {

    fs.mkdirSync(dirPath, {
      recursive: true
    });
  }

  return dirPath;
}

function ensureLogsDir() {

  return ensureDirectory(
    getLogsDir()
  );
}

function ensureSavedContactsDir() {

  return ensureDirectory(
    getSavedContactsDir()
  );
}

function sanitizeFileName(name) {

  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "contacts";
}

function createTimestamp() {

  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function hashFile(filePath) {

  const hash =
    crypto.createHash("sha256");

  hash.update(
    fs.readFileSync(filePath)
  );

  return hash.digest("hex");
}

function isContactFile(fileName) {

  return [
    ".xlsx",
    ".xls",
    ".csv"
  ].includes(
    path.extname(fileName).toLowerCase()
  );
}

function getSavedContactEntries() {

  const savedContactsDir =
    ensureSavedContactsDir();

  const groups = new Map();

  fs.readdirSync(savedContactsDir)
    .filter(isContactFile)
    .forEach(fileName => {

      const filePath =
        path.join(savedContactsDir, fileName);

      const stats =
        fs.statSync(filePath);

      const fileHash =
        hashFile(filePath);

      if (!groups.has(fileHash)) {

        groups.set(fileHash, []);
      }

      groups.get(fileHash).push({
        id: fileName,
        fileName,
        filePath,
        displayName:
          fileName.replace(
            /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/,
            ""
          ),
        size: stats.size,
        modifiedAtMs:
          stats.mtimeMs,
        modifiedAt:
          stats.mtime.toISOString()
      });
    });

  return [...groups.values()]
    .map(entries => {

      const newest =
        entries.sort((a, b) => {
          return b.modifiedAtMs - a.modifiedAtMs;
        })[0];

      let count = null;
      let loadError = null;

      try {

        count =
          loadContacts(newest.filePath).length;

      } catch (error) {

        loadError =
          error.message;
      }

      return {
        ...newest,
        count,
        loadError,
        duplicateCount:
          entries.length
      };
    })
    .sort((a, b) => {
      return new Date(b.modifiedAt) -
        new Date(a.modifiedAt);
    });
}

function resolveSavedContactPath(id) {

  const savedContactsDir =
    ensureSavedContactsDir();

  const requestedPath =
    path.resolve(savedContactsDir, id);

  const savedRoot =
    path.resolve(savedContactsDir);

  const relativePath =
    path.relative(savedRoot, requestedPath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {

    throw new Error("Invalid saved contacts file");
  }

  if (!fs.existsSync(requestedPath)) {

    throw new Error("Saved contacts file was not found");
  }

  if (!isContactFile(requestedPath)) {

    throw new Error("Saved file is not a contacts file");
  }

  return requestedPath;
}

function archiveContactFile(filePath) {

  const savedContactsDir =
    ensureSavedContactsDir();

  const sourceHash =
    hashFile(filePath);

  const duplicate =
    fs.readdirSync(savedContactsDir)
      .filter(isContactFile)
      .find(fileName => {

        const savedFilePath =
          path.join(savedContactsDir, fileName);

        return hashFile(savedFilePath) ===
          sourceHash;
      });

  if (duplicate) {

    return {
      filePath:
        path.join(savedContactsDir, duplicate),
      duplicate: true
    };
  }

  const parsed =
    path.parse(filePath);

  const fileName = [
    createTimestamp(),
    sanitizeFileName(parsed.name)
  ].join("_") + parsed.ext.toLowerCase();

  const savedFilePath =
    path.join(savedContactsDir, fileName);

  fs.copyFileSync(
    filePath,
    savedFilePath
  );

  return {
    filePath: savedFilePath,
    duplicate: false
  };
}

function findLatestLogFile(prefix) {

  const logsDir =
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

  const logTypes = {
    success: {
      prefix: "success",
      extension: ".csv"
    },
    failed: {
      prefix: "failed",
      extension: ".csv"
    },
    send: {
      prefix: "send-log",
      extension: ".json"
    }
  };

  const logType = logTypes[kind];

  if (!logType) {

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

  const logsDir =
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

function deleteLogFiles(kind) {

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

  const logsDir =
    ensureLogsDir();

  const files = fs.readdirSync(logsDir)
    .filter(file => {
      return file.startsWith(`${logType.prefix}-`) &&
        file.endsWith(logType.extension);
    });

  const errors = [];

  files.forEach(file => {

    const filePath =
      path.join(logsDir, file);

    try {

      fs.unlinkSync(filePath);

    } catch (error) {

      errors.push(
        `${file}: ${error.message}`
      );
    }
  });

  if (errors.length > 0) {

    return {
      success: false,
      deletedCount:
        files.length - errors.length,
      error:
        `Some logs could not be deleted: ${errors.join("; ")}`
    };
  }

  return {
    success: true,
    deletedCount:
      files.length
  };
}

function buildValidationWarnings(data = {}) {

  const contacts =
    Array.isArray(data.contacts)
      ? data.contacts
      : [];

  const template =
    String(data.template || "");

  const mediaFile =
    data.mediaFile || null;

  const phoneField =
    process.env.PHONE_COLUMN || "phone";

  const warnings = [];
  const invalidPhones = [];
  const duplicatePhones = [];
  const seenPhones = new Set();
  const mediaValidation =
    mediaFile
      ? validateMediaFile(mediaFile)
      : null;
  const hasValidMedia =
    Boolean(mediaValidation?.valid);

  if (contacts.length === 0) {

    warnings.push({
      type: "error",
      title: "No contacts loaded",
      message:
        "Load a contacts file before starting a broadcast."
    });
  }

  contacts.forEach((contact, index) => {

    const rawPhone =
      contact[phoneField];

    const validation =
      validatePhone(rawPhone);

    if (!validation.valid) {

      invalidPhones.push({
        row: index + 2,
        phone: String(rawPhone || ""),
        reason: validation.reason
      });

      return;
    }

    if (seenPhones.has(validation.phone)) {

      duplicatePhones.push({
        row: index + 2,
        phone: String(rawPhone)
      });

      return;
    }

    seenPhones.add(validation.phone);
  });

  if (
    contacts.length > 0 &&
    seenPhones.size === 0
  ) {

    warnings.push({
      type: "error",
      title: "No valid phone numbers",
      message:
        "Fix the contacts file before starting a broadcast."
    });
  }

  if (invalidPhones.length > 0) {

    warnings.push({
      type: "warning",
      title: "Invalid phone numbers",
      message:
        `${invalidPhones.length} contact(s) will be skipped during sending.`,
      details: invalidPhones
        .slice(0, 5)
        .map(item => {
          return `Row ${item.row}: ${item.phone || "(blank)"} - ${item.reason}`;
        })
    });
  }

  if (duplicatePhones.length > 0) {

    warnings.push({
      type: "warning",
      title: "Duplicate phone numbers",
      message:
        `${duplicatePhones.length} duplicate contact(s) may receive repeated messages.`,
      details: duplicatePhones
        .slice(0, 5)
        .map(item => {
          return `Row ${item.row}: ${item.phone}`;
        })
    });
  }

  if (!template.trim() && !hasValidMedia) {

    warnings.push({
      type: "error",
      title: "Empty message",
      message:
        "Add a message template or choose a valid media file before sending."
    });

  } else if (!template.trim() && hasValidMedia) {

    warnings.push({
      type: "warning",
      title: "Empty message template",
      message:
        "The selected media will be sent without a caption."
    });
  }

  const templateValidation =
    validateTemplateVariables(
      template,
      contacts
    );

  if (!templateValidation.valid) {

    warnings.push({
      type: "warning",
      title: "Missing template variables",
      message:
        "Some placeholders are not present in the contacts file and will be blank.",
      details: templateValidation.missing
        .slice(0, 10)
        .map(variable => {
          return `{{${variable}}}`;
        })
    });
  }

  if (mediaFile && mediaValidation) {

    if (!mediaValidation.valid) {

      warnings.push({
        type: "warning",
        title: "Media file warning",
        message:
          `${mediaValidation.reason}. The sender will fall back to text only.`
      });
    }
  }

  return {
    valid:
      !warnings.some(warning => {
        return warning.type === "error";
      }),
    warnings,
    summary: {
      totalContacts: contacts.length,
      validPhones: seenPhones.size,
      invalidPhones: invalidPhones.length,
      duplicatePhones: duplicatePhones.length
    }
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

      let savedFilePath = null;
      let savedDuplicate = false;
      let archiveError = null;

      try {

        const archiveResult =
          archiveContactFile(filePath);

        savedFilePath =
          archiveResult.filePath;

        savedDuplicate =
          archiveResult.duplicate;

      } catch (error) {

        archiveError =
          error.message;
      }

      return {
        success: true,
        filePath,
        savedFilePath,
        savedDuplicate,
        archiveError,
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

// List saved contact files
ipcMain.handle(
  "list-saved-contact-files",
  async () => {

    try {

      return {
        success: true,
        files:
          getSavedContactEntries()
      };

    } catch (error) {

      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }
);

// Load a saved contact file without archiving it again
ipcMain.handle(
  "load-saved-contact-file",
  async (_, id) => {

    try {

      const filePath =
        resolveSavedContactPath(id);

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

// Open saved contact files folder
ipcMain.handle(
  "open-saved-contacts-folder",
  async () => {

    try {

      const folderPath =
        ensureSavedContactsDir();

      const error =
        await shell.openPath(folderPath);

      if (error) {

        return {
          success: false,
          error
        };
      }

      return {
        success: true,
        folderPath
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

    broadcastController.paused =
      false;

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

// Delete generated success/failed CSV logs
ipcMain.handle(
  "clean-log-files",
  async (_, kind) => {

    try {

      return deleteLogFiles(kind);

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

// Validate contacts, template, and media before sending
ipcMain.handle(
  "validate-broadcast-input",
  async (_, data) => {

    try {

      return buildValidationWarnings(data);

    } catch (error) {

      return {
        valid: false,
        warnings: [
          {
            type: "error",
            title: "Validation failed",
            message: error.message
          }
        ],
        summary: {
          totalContacts: 0,
          validPhones: 0,
          invalidPhones: 0,
          duplicatePhones: 0
        }
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

      const validation =
        buildValidationWarnings({
          contacts,
          template,
          mediaFile
        });

      if (!validation.valid) {

        const error =
          validation.warnings.find(warning => {
            return warning.type === "error";
          });

        return {
          success: false,
          error:
            error?.message ||
            "Broadcast validation failed",
          validation
        };
      }

      // Progress callback
      const options = {

        template,

        mediaFile,

        logsDir:
          ensureLogsDir(),

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
