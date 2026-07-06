const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const {
  getTelegramConfig,
  getTelegramSessionPath,
  loadTelegramSession,
  saveTelegramSession,
  validateTelegramConfig
} = require("./telegramSession");

async function loginWithTelegramQr({
  onError,
  onPassword,
  onQrCode,
  onStatus
} = {}) {

  const config =
    validateTelegramConfig(
      getTelegramConfig()
    );

  const sessionOptions = {
    sessionName:
      config.sessionName
  };

  const client =
    createTelegramClient(
      config,
      loadTelegramSession(sessionOptions)
    );

  try {

    await emitStatus(
      onStatus,
      "Connecting to Telegram..."
    );

    await client.connect();

    if (await client.isUserAuthorized()) {

      const sessionPath =
        saveCurrentSession(
          client,
          sessionOptions
        );

      return {
        alreadyAuthorized: true,
        sessionPath
      };
    }

    await emitStatus(
      onStatus,
      "Use Telegram mobile: Settings > Devices > Link Desktop Device."
    );

    await client.signInUserWithQrCode(
      {
        apiId:
          config.apiId,
        apiHash:
          config.apiHash
      },
      {
        qrCode: async (qrCode) => {

          const loginUrl =
            createTelegramLoginUrl(qrCode.token);

          await emitQrCode(
            onQrCode,
            {
              expiresAt:
                new Date(qrCode.expires * 1000),
              loginUrl
            }
          );
        },

        password: async (hint) => {

          if (!onPassword) {

            throw new Error(
              "Telegram two-step verification password is required."
            );
          }

          return onPassword(hint);
        },

        onError: async (error) => {

          if (onError) {

            return onError(error);
          }

          return false;
        }
      }
    );

    const sessionPath =
      saveCurrentSession(
        client,
        sessionOptions
      );

    return {
      alreadyAuthorized: false,
      sessionPath
    };

  } finally {

    await client.disconnect();
  }
}

function createTelegramClient(
  config,
  sessionString = ""
) {

  return new TelegramClient(
    new StringSession(sessionString),
    config.apiId,
    config.apiHash,
    {
      connectionRetries: 5,
      useWSS: true
    }
  );
}

function saveCurrentSession(
  client,
  sessionOptions
) {

  return saveTelegramSession(
    client.session.save(),
    sessionOptions
  );
}

async function emitStatus(
  onStatus,
  message
) {

  if (onStatus) {

    await onStatus(message);
  }
}

async function emitQrCode(
  onQrCode,
  qrCode
) {

  if (onQrCode) {

    await onQrCode(qrCode);
  }
}

function toBase64Url(buffer) {

  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createTelegramLoginUrl(token) {

  return `tg://login?token=${toBase64Url(token)}`;
}

module.exports = {
  createTelegramClient,
  createTelegramLoginUrl,
  getTelegramSessionPath,
  loginWithTelegramQr,
  toBase64Url
};
