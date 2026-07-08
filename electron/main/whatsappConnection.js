const {
  createBrowserLaunchConfig,
  getMissingBrowserMessage
} = require("../../src/browserRuntime");

function createWhatsAppConnectionService({
  app,
  runtimePaths,
  settingsService,
  wppconnect
}) {

  let client = null;
  let connectPromise = null;

  async function connect(event) {

    settingsService.configureRuntimePaths();

    if (client) {

      const connected =
        typeof client.isConnected === "function"
          ? await client.isConnected()
            .catch(() => false)
          : true;

      if (connected) {

        sendConnectionStatus(
          event,
          "CONNECTED"
        );

        return {
          success: true,
          alreadyConnected: true
        };
      }

      // Stale/disconnected client — clear it and fall through to create a new session.
      if (typeof client.close === "function") {
        await client.close().catch(() => {});
      }
      client = null;
    }

    if (connectPromise) {

      const result =
        await connectPromise;

      if (result.success) {

        sendConnectionStatus(
          event,
          "CONNECTED"
        );
      }

      return result;
    }

    connectPromise =
      createClient(event);

    try {

      return await connectPromise;

    } finally {

      connectPromise = null;
    }
  }

  async function createClient(event) {

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
            settingsService.getSessionName(),

          folderNameToken:
            runtimePaths.getTokensDir(),

          headless: true,

          autoClose: 0,

          ...browserLaunchConfig.options,

          catchQR: (base64Qr) => {

            sendEvent(
              event,
              "qr-code",
              base64Qr
            );
          },

          statusFind: (status) => {

            sendEvent(
              event,
              "connection-status",
              status
            );
          }
        });

      sendConnectionStatus(
        event,
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

  function sendConnectionStatus(
    event,
    status
  ) {

    sendEvent(
      event,
      "connection-status",
      status
    );
  }

  function sendEvent(
    event,
    channel,
    payload
  ) {

    if (
      event &&
      event.sender &&
      typeof event.sender.send === "function"
    ) {

      event.sender.send(
        channel,
        payload
      );
    }
  }

  function getClient() {

    return client;
  }

  return {
    connect,
    getClient
  };
}

module.exports = {
  createWhatsAppConnectionService
};
