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

const telegramService =
  require("../src/services/telegramService");

const {
  sendTelegramBroadcast
} = require("../src/telegramSender");

const {
  resolveTelegramRecipient,
  TELEGRAM_RECIPIENT_COLUMN
} = require("../src/telegramRecipient");

const {
  generateMessage
} = require("../src/template");

const {
  loadContacts
} = require("../src/contacts");

const {
  loadTelegramContacts
} = require("../src/telegramContacts");

const {
  validatePhone,
  validateTemplateVariables
} = require("../src/validator");

const {
  validateMediaFile
} = require("../src/media");

const {
  getPhoneValue
} = require("../src/phoneColumn");

const broadcastController =
  require("../src/broadcastController");

const {
  configureSettingsPath,
  getDefaultSettings,
  loadSettings,
  saveSettings
} = require("../src/settings");

const {
  createBrowserLaunchConfig,
  getMissingBrowserMessage
} = require("../src/browserRuntime");

const {
  createContactFileService
} = require("./contactFiles");

let client = null;

const MESSAGING_PROVIDERS = {
  TELEGRAM: "telegram",
  WHATSAPP: "whatsapp"
};

function normalizeMessagingProvider(provider) {

  const normalized =
    String(provider || "")
      .trim()
      .toLowerCase();

  if (!normalized) {

    return MESSAGING_PROVIDERS.WHATSAPP;
  }

  if (normalized === MESSAGING_PROVIDERS.TELEGRAM) {

    return MESSAGING_PROVIDERS.TELEGRAM;
  }

  if (normalized === MESSAGING_PROVIDERS.WHATSAPP) {

    return MESSAGING_PROVIDERS.WHATSAPP;
  }

  throw new Error(
    `Unsupported messaging provider: ${provider}`
  );
}

const contactFiles =
  createContactFileService({
    app,
    dialog,
    shell
  });

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

function getDataDir() {

  return path.join(
    getWritableRootDir(),
    "data"
  );
}

function getSavedContactsDir() {

  return path.join(
    getDataDir(),
    "saved-contacts"
  );
}

function getTokensDir() {

  return path.join(
    getWritableRootDir(),
    "tokens"
  );
}

function getWritableSettingsPath() {

  return path.join(
    getWritableRootDir(),
    "settings.json"
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

function ensureRuntimePaths() {

  ensureDirectory(
    getWritableRootDir()
  );

  ensureDirectory(
    getDataDir()
  );

  ensureDirectory(
    getSavedContactsDir()
  );

  ensureLogsDir();

  ensureDirectory(
    getTokensDir()
  );
}

function configureRuntimePaths() {

  ensureRuntimePaths();

  configureSettingsPath(
    getWritableSettingsPath()
  );
}

function getRuntimeSettings() {

  configureRuntimePaths();

  return loadSettings();
}

function getConfiguredText(
  settingsValue,
  envName,
  fallbackValue
) {

  const envValue =
    process.env[envName];

  if (
    typeof envValue === "string" &&
    envValue.trim()
  ) {

    return envValue.trim();
  }

  if (
    typeof settingsValue === "string" &&
    settingsValue.trim()
  ) {

    return settingsValue.trim();
  }

  return fallbackValue;
}

function getConfiguredNumber(
  settingsValue,
  envName,
  fallbackValue,
  {
    integer = true,
    minimum = 0
  } = {}
) {

  const envValue =
    process.env[envName];

  const rawValue =
    envValue !== undefined &&
    String(envValue).trim() !== ""
      ? envValue
      : settingsValue;

  const parsedValue =
    Number(rawValue);

  if (
    Number.isFinite(parsedValue) &&
    parsedValue >= minimum
  ) {

    return integer
      ? Math.floor(parsedValue)
      : parsedValue;
  }

  const parsedFallback =
    Number(fallbackValue);

  if (Number.isFinite(parsedFallback)) {

    return parsedFallback;
  }

  return minimum;
}

function getSessionName() {

  const settings =
    getRuntimeSettings();

  const defaults =
    getDefaultSettings();

  return getConfiguredText(
    settings.whatsappSessionName,
    "SESSION_NAME",
    defaults.whatsappSessionName
  );
}

function getSendingSettings() {

  const settings =
    getRuntimeSettings();

  const defaults =
    getDefaultSettings();

  const sending =
    settings.sending || {};

  const defaultSending =
    defaults.sending;

  const delayMin =
    getConfiguredNumber(
      sending.delayMin,
      "MESSAGE_DELAY_MIN",
      defaultSending.delayMin
    );

  const delayMax =
    Math.max(
      delayMin,
      getConfiguredNumber(
        sending.delayMax,
        "MESSAGE_DELAY_MAX",
        defaultSending.delayMax
      )
    );

  return {
    delayMin,
    delayMax,
    batchSize:
      getConfiguredNumber(
        sending.batchSize,
        "BATCH_SIZE",
        defaultSending.batchSize,
        {
          minimum: 1
        }
      ),
    batchPause:
      getConfiguredNumber(
        sending.batchPause,
        "BATCH_PAUSE",
        defaultSending.batchPause
      ),
    mediaRetryAttempts:
      getConfiguredNumber(
        sending.mediaRetryAttempts,
        "MEDIA_RETRY_ATTEMPTS",
        defaultSending.mediaRetryAttempts,
        {
          minimum: 1
        }
      ),
    mediaRetryDelay:
      getConfiguredNumber(
        sending.mediaRetryDelay,
        "MEDIA_RETRY_DELAY",
        defaultSending.mediaRetryDelay
      )
  };
}

function getLogType(kind) {

  const logTypes = {
    success: {
      prefix: "success",
      extension: ".csv"
    },
    failed: {
      prefix: "failed",
      extension: ".csv"
    },
    failedRetry: {
      prefix: "retry-failed",
      extension: ".csv"
    },
    send: {
      prefix: "send-log",
      extension: ".json"
    }
  };

  return logTypes[kind] || null;
}

function findLatestLogFile(kind) {

  const logType =
    getLogType(kind);

  if (!logType) {

    return null;
  }

  const logsDir =
    ensureLogsDir();

  const files = fs.readdirSync(logsDir)
    .filter(file => {
      return file.startsWith(`${logType.prefix}-`) &&
        file.endsWith(logType.extension);
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

  const logType =
    getLogType(kind);

  if (!logType) {

    return {
      success: false,
      error: "Unknown log type"
    };
  }

  const logFile =
    findLatestLogFile(kind);

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

  const logType =
    getLogType(kind);

  if (!logType) {

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

  const provider =
    normalizeMessagingProvider(data.provider);

  const contacts =
    Array.isArray(data.contacts)
      ? data.contacts
      : [];

  const template =
    String(data.template || "");

  const mediaFile =
    data.mediaFile || null;

  const warnings = [];
  const recipientValidation =
    buildRecipientValidationSummary(
      provider,
      contacts
    );

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
        "Add or select a contacts file before starting a broadcast."
    });
  }

  if (
    contacts.length > 0 &&
    recipientValidation.validCount === 0
  ) {

    warnings.push({
      type: "error",
      title:
        recipientValidation.noValidTitle,
      message:
        recipientValidation.noValidMessage
    });
  }

  if (recipientValidation.invalid.length > 0) {

    warnings.push({
      type: "warning",
      title:
        recipientValidation.invalidTitle,
      message:
        `${recipientValidation.invalid.length} contact(s) will be skipped during sending.`,
      details: recipientValidation.invalid
        .map(item => {
          return `Row ${item.row}: ${item.value || "(blank)"} - ${item.reason}`;
        })
    });
  }

  if (recipientValidation.duplicates.length > 0) {

    warnings.push({
      type: "warning",
      title:
        recipientValidation.duplicateTitle,
      message:
        `${recipientValidation.duplicates.length} duplicate contact(s) may receive repeated messages.`,
      details: recipientValidation.duplicates
        .map(item => {
          return `Row ${item.row}: ${item.value}`;
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
        .map(variable => {
          return `{{${variable}}}`;
        })
    });
  }

  if (mediaFile && mediaValidation) {

    if (!mediaValidation.valid) {

      warnings.push({
        type: "error",
        title: "Media file cannot be sent",
        message:
          `${mediaValidation.reason}. Remove the selected media or choose a supported file before starting.`
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
      provider,
      totalContacts: contacts.length,
      validPhones:
        recipientValidation.validCount,
      invalidPhones:
        recipientValidation.invalid.length,
      duplicatePhones:
        recipientValidation.duplicates.length,
      validRecipients:
        recipientValidation.validCount,
      invalidRecipients:
        recipientValidation.invalid.length,
      duplicateRecipients:
        recipientValidation.duplicates.length
    }
  };
}

function buildRecipientValidationSummary(
  provider,
  contacts
) {

  if (provider === MESSAGING_PROVIDERS.TELEGRAM) {

    return buildTelegramRecipientValidationSummary(
      contacts
    );
  }

  return buildWhatsAppRecipientValidationSummary(
    contacts
  );
}

function buildWhatsAppRecipientValidationSummary(
  contacts
) {

  const invalid = [];
  const duplicates = [];
  const seenPhones = new Set();

  contacts.forEach((contact, index) => {

    const rawPhone =
      getPhoneValue(contact);

    const validation =
      validatePhone(rawPhone);

    if (!validation.valid) {

      invalid.push({
        row: index + 2,
        value: String(rawPhone || ""),
        reason: validation.reason
      });

      return;
    }

    if (seenPhones.has(validation.phone)) {

      duplicates.push({
        row: index + 2,
        value: String(rawPhone)
      });

      return;
    }

    seenPhones.add(validation.phone);
  });

  return {
    duplicateTitle:
      "Duplicate phone numbers",
    duplicates,
    invalid,
    invalidTitle:
      "Invalid phone numbers",
    noValidMessage:
      "Fix the contacts file before starting a broadcast.",
    noValidTitle:
      "No valid phone numbers",
    validCount:
      seenPhones.size
  };
}

function buildTelegramRecipientValidationSummary(
  contacts
) {

  const invalid = [];
  const duplicates = [];
  const seenRecipients = new Set();

  contacts.forEach((contact, index) => {

    const validation =
      resolveTelegramRecipient(contact);

    const rawRecipient =
      validation.rawRecipient;

    if (!validation.valid) {

      invalid.push({
        row: index + 2,
        value:
          String(rawRecipient || ""),
        reason:
          validation.reason
      });

      return;
    }

    const recipientKey =
      String(validation.chatId)
        .trim()
        .toLowerCase();

    if (seenRecipients.has(recipientKey)) {

      duplicates.push({
        row: index + 2,
        value:
          String(rawRecipient)
      });

      return;
    }

    seenRecipients.add(recipientKey);
  });

  return {
    duplicateTitle:
      "Duplicate Telegram recipients",
    duplicates,
    invalid,
    invalidTitle:
      "Invalid Telegram recipients",
    noValidMessage:
      `Fix the contacts file before starting a Telegram broadcast. It must contain ${TELEGRAM_RECIPIENT_COLUMN}.`,
    noValidTitle:
      "No valid Telegram recipients",
    validCount:
      seenRecipients.size
  };
}

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

  configureRuntimePaths();

  createWindow();
});

// Open contacts file
ipcMain.handle(
  "select-contacts-file",
  async (_, options = {}) => {

    const provider =
      normalizeMessagingProvider(options.provider);

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
        provider === MESSAGING_PROVIDERS.TELEGRAM
          ? loadTelegramContacts(filePath)
          : loadContacts(filePath);

      let savedFilePath = null;
      let savedDuplicate = false;
      let archiveError = null;

      if (provider === MESSAGING_PROVIDERS.WHATSAPP) {

        try {

          const archiveResult =
            contactFiles.archiveContactFile(filePath);

          savedFilePath =
            archiveResult.filePath;

          savedDuplicate =
            archiveResult.duplicate;

        } catch (error) {

          archiveError =
            error.message;
        }
      }

      return {
        success: true,
        filePath,
        provider,
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

contactFiles.registerHandlers(ipcMain);

// Generate preview messages
ipcMain.handle(
  "generate-preview",
  async (_, data) => {

    const {
      contacts,
      template,
      mediaFile
    } = data;

    const provider =
      normalizeMessagingProvider(data.provider);

    const preview = contacts
      .slice(0, 5)
      .map(contact => {

        return {

          phone:
            provider === MESSAGING_PROVIDERS.TELEGRAM
              ? contact[TELEGRAM_RECIPIENT_COLUMN]
              : getPhoneValue(contact),

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

    configureRuntimePaths();

    if (client) {

      const connected =
        typeof client.isConnected === "function"
          ? await client.isConnected()
            .catch(() => false)
          : true;

      if (connected) {

        event.sender.send(
          "connection-status",
          "CONNECTED"
        );

        return {
          success: true,
          alreadyConnected: true
        };
      }

      return {
        success: false,
        error:
          "WhatsApp is already open. Log out or restart the app before reconnecting."
      };
    }

    try {

      const browserLaunchConfig =
        createBrowserLaunchConfig();

      if (browserLaunchConfig.browser) {

        console.log(
          `Using ${browserLaunchConfig.browser.name}: ${browserLaunchConfig.browser.executablePath}`
        );

      } else if (app.isPackaged && process.platform === "win32") {

        return {
          success: false,
          error: getMissingBrowserMessage()
        };
      }

      client =
        await wppconnect.create({

          session:
            getSessionName(),

          folderNameToken:
            getTokensDir(),

          headless: true,

          autoClose: 0,

          ...browserLaunchConfig.options,

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
        findLatestLogFile("failedRetry") ||
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

      const {
        contacts,
        template,
        mediaFile
      } = data;

      const provider =
        normalizeMessagingProvider(data.provider);

      if (
        provider === MESSAGING_PROVIDERS.WHATSAPP &&
        !client
      ) {

        return {
          success: false,
          error:
            "WhatsApp not connected"
        };
      }

      const validation =
        buildValidationWarnings({
          contacts,
          template,
          mediaFile,
          provider
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

      const sendingSettings =
        getSendingSettings();

      // Progress callback
      const options = {

        provider,

        template,

        mediaFile,

        logsDir:
          ensureLogsDir(),

        delayMin:
          sendingSettings.delayMin,

        delayMax:
          sendingSettings.delayMax,

        batchSize:
          sendingSettings.batchSize,

        batchPause:
          sendingSettings.batchPause,

        mediaRetryAttempts:
          sendingSettings.mediaRetryAttempts,

        mediaRetryDelay:
          sendingSettings.mediaRetryDelay,

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
      let activeClient =
        null;

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

        if (provider === MESSAGING_PROVIDERS.TELEGRAM) {

          activeClient =
            await telegramService.initialize();

          broadcastResult =
            await sendTelegramBroadcast(
              activeClient,
              contacts,
              options
            );

        } else {

          activeClient =
            client;

          broadcastResult =
            await sendBroadcast(
              activeClient,
              contacts,
              options
            );
        }

      } finally {

        console.log = originalLog;

        if (
          provider === MESSAGING_PROVIDERS.TELEGRAM &&
          activeClient
        ) {

          await telegramService.disconnect(
            activeClient
          );
        }
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

    configureRuntimePaths();

    return loadSettings();
  }
);

// Save template
ipcMain.handle(
  "save-template",
  async (_, template) => {

    configureRuntimePaths();

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
