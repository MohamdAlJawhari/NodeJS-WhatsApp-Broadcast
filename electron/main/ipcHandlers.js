const {
  getTelegramRecipientLabel
} = require("../../src/telegramRecipient");

const {
  generateMessage
} = require("../../src/template");

const {
  loadContacts
} = require("../../src/contacts");

const {
  loadTelegramContacts
} = require("../../src/telegramContacts");

const {
  getPhoneValue
} = require("../../src/phoneColumn");

const {
  MESSAGING_PROVIDERS,
  normalizeMessagingProvider
} = require("./provider");

const {
  buildValidationWarnings
} = require("./validationService");

function registerIpcHandlers({
  ipcMain,
  dialog,
  contactFiles,
  whatsappConnection,
  telegramConnection,
  broadcastOrchestrator,
  logService,
  settingsService
}) {

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

  ipcMain.handle(
    "generate-preview",
    async (_, data) => {

      const {
        contacts,
        template
      } = data;

      const provider =
        normalizeMessagingProvider(data.provider);

      const preview = contacts
        .slice(0, 5)
        .map(contact => {

          return {

            phone:
              provider === MESSAGING_PROVIDERS.TELEGRAM
                ? getTelegramRecipientLabel(contact)
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

  ipcMain.handle(
    "connect-whatsapp",
    async (event) => {
      return whatsappConnection.connect(event);
    }
  );

  ipcMain.handle(
    "connect-telegram",
    async (event) => {
      return telegramConnection.connect(event);
    }
  );

  ipcMain.handle(
    "pause-broadcast",
    async () => {
      return broadcastOrchestrator.pause();
    }
  );

  ipcMain.handle(
    "resume-broadcast",
    async () => {
      return broadcastOrchestrator.resume();
    }
  );

  ipcMain.handle(
    "stop-broadcast",
    async () => {
      return broadcastOrchestrator.stop();
    }
  );

  ipcMain.handle(
    "open-log-folder",
    async (_, kind) => {

      try {

        return await logService.openLogLocation(kind);

      } catch (error) {

        return {
          success: false,
          error: error.message
        };
      }
    }
  );

  ipcMain.handle(
    "clean-log-files",
    async (_, kind) => {

      try {

        return logService.deleteLogFiles(kind);

      } catch (error) {

        return {
          success: false,
          error: error.message
        };
      }
    }
  );

  ipcMain.handle(
    "load-latest-failed-contacts",
    async () => {

      try {

        const failedFile =
          logService.findLatestLogFile("failedRetry") ||
          logService.findLatestLogFile("failed");

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

  ipcMain.handle(
    "start-broadcast",
    async (event, data) => {
      return broadcastOrchestrator.start(
        event,
        data
      );
    }
  );

  ipcMain.handle(
    "load-settings",
    async () => {
      return settingsService.loadRuntimeSettings();
    }
  );

  ipcMain.handle(
    "save-template",
    async (_, template) => {
      return settingsService.saveDefaultTemplate(
        template
      );
    }
  );
}

module.exports = {
  registerIpcHandlers
};
