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

  async function connect(event) {

    settingsService.configureRuntimePaths();

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
            settingsService.getSessionName(),

          folderNameToken:
            runtimePaths.getTokensDir(),

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
