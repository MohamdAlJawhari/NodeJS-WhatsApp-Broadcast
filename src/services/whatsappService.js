const path = require("path");
const { isImage } = require("../media");

async function initialize() {

  return null;
}

async function sendText(
  client,
  chatId,
  message
) {

  await client.sendText(chatId, message);
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

  if (isImage(mediaValidation.extension)) {

    await client.sendImage(
      chatId,
      normalizedMediaPath,
      path.basename(normalizedMediaPath),
      message
    );

    return;
  }

  await client.sendFile(
    chatId,
    normalizedMediaPath,
    path.basename(normalizedMediaPath),
    message
  );
}

async function disconnect() {

  return null;
}

module.exports = {
  disconnect,
  initialize,
  sendMedia,
  sendText
};
