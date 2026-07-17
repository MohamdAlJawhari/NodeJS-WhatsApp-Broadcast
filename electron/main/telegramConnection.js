const qrcode = require("qrcode");

const {
  loginWithTelegramQr
} = require("../../src/services/telegramLoginService");

const telegramService =
  require("../../src/services/telegramService");

function createTelegramConnectionService({
  runtimePaths,
  telegramCredentials
}) {

  async function connect(event) {

    try {

      const result =
        await loginWithTelegramQr({

          config:
            telegramCredentials.requireCredentials(),

          tokensDir:
            runtimePaths.getTokensDir(),

          onError: async (error) => {

            event.sender.send(
              "telegram-connection-status",
              `Telegram login error: ${error.message}`
            );

            return false;
          },

          onPassword: async () => {

            throw new Error(
              "Telegram two-step verification is enabled. Run 'node scripts/telegramQrLogin.cjs' to connect this account."
            );
          },

          onQrCode: async (qrCode) => {

            const qrDataUrl =
              await qrcode.toDataURL(
                qrCode.loginUrl,
                {
                  margin: 1,
                  width: 260
                }
              );

            event.sender.send(
              "telegram-qr-code",
              {
                expiresAt:
                  qrCode.expiresAt.toISOString(),
                loginUrl:
                  qrCode.loginUrl,
                qrDataUrl
              }
            );
          },

          onStatus: async (message) => {

            event.sender.send(
              "telegram-connection-status",
              message
            );
          }
        });

      event.sender.send(
        "telegram-connection-status",
        "CONNECTED"
      );

      return {
        success: true,
        alreadyConnected:
          result.alreadyAuthorized,
        sessionPath:
          result.sessionPath
      };

    } catch (error) {

      event.sender.send(
        "telegram-connection-status",
        "ERROR"
      );

      return {
        success: false,
        error: error.message
      };
    }
  }

  async function createClient() {

    return telegramService.initialize({
      config:
        telegramCredentials.requireCredentials(),
      tokensDir:
        runtimePaths.getTokensDir()
    });
  }

  async function disconnectClient(client) {

    await telegramService.disconnect(client);
  }

  return {
    createClient,
    disconnectClient,
    connect
  };
}

module.exports = {
  createTelegramConnectionService
};
