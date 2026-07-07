const {
  sendBroadcast
} = require("../../src/sender");

const telegramService =
  require("../../src/services/telegramService");

const {
  sendTelegramBroadcast
} = require("../../src/telegramSender");

const broadcastController =
  require("../../src/broadcastController");

const {
  MESSAGING_PROVIDERS,
  normalizeMessagingProvider
} = require("./provider");

const {
  buildValidationWarnings
} = require("./validationService");

function createBroadcastOrchestrator({
  runtimePaths,
  settingsService,
  whatsappConnection
}) {

  async function pause() {

    broadcastController.paused =
      true;

    return {
      success: true
    };
  }

  async function resume() {

    broadcastController.paused =
      false;

    return {
      success: true
    };
  }

  async function stop() {

    broadcastController.paused =
      false;

    broadcastController.stopped =
      true;

    return {
      success: true
    };
  }

  async function start(event, data) {

    try {

      const {
        contacts,
        template,
        mediaFile
      } = data;

      const provider =
        normalizeMessagingProvider(data.provider);

      const whatsAppClient =
        whatsappConnection.getClient();

      if (
        provider === MESSAGING_PROVIDERS.WHATSAPP &&
        !whatsAppClient
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
        settingsService.getSendingSettings();

      const options = {

        provider,

        template,

        mediaFile,

        logsDir:
          runtimePaths.ensureLogsDir(),

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
            total > 0 ? (current / total) * 100 : 0;

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
            whatsAppClient;

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
          try {
            await telegramService.disconnect(
              activeClient
            );
          } catch (disconnectError) {
            console.error("Failed to disconnect Telegram client:", disconnectError);
          }
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

  return {
    pause,
    resume,
    start,
    stop
  };
}

module.exports = {
  createBroadcastOrchestrator
};
