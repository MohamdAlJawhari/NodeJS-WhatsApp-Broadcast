const path = require("path");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const {
  getTelegramConfig,
  loadTelegramSession,
  validateTelegramConfig
} = require("./telegramSession");

async function initialize({
  config: suppliedConfig,
  tokensDir
} = {}) {

  const config =
    validateTelegramConfig(
      suppliedConfig || getTelegramConfig()
    );

  const sessionString =
    loadTelegramSession({
      sessionName:
        config.sessionName,
      tokensDir
    });

  if (!sessionString) {

    throw new Error(
      "Telegram session was not found. Run node scripts\\telegramQrLogin.cjs first."
    );
  }

  const client =
    new TelegramClient(
      new StringSession(sessionString),
      config.apiId,
      config.apiHash,
      {
        connectionRetries: 5,
        useWSS: true
      }
    );

  await client.connect();

  if (!(await client.isUserAuthorized())) {

    await disconnect(client);

    throw new Error(
      "Telegram session is not authorized. Run node scripts\\telegramQrLogin.cjs again."
    );
  }

  return client;
}

async function disconnect(client) {

  if (
    client &&
    typeof client.disconnect === "function"
  ) {

    await client.disconnect();
  }
}

async function sendText(
  client,
  chatId,
  message
) {

  await client.sendMessage(
    chatId,
    {
      message
    }
  );
}

async function sendMedia(
  client,
  chatId,
  mediaFile,
  mediaValidation,
  message
) {

  const normalizedMediaPath =
    path.resolve(mediaFile);

  await client.sendFile(
    chatId,
    {
      file:
        normalizedMediaPath,
      caption:
        message || ""
    }
  );
}

module.exports = {
  disconnect,
  initialize,
  sendMedia,
  sendText
};
