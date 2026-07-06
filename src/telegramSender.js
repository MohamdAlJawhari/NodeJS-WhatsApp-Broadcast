const { sendBroadcast } = require("./sender");
const telegramService = require("./services/telegramService");

const {
  resolveTelegramRecipient,
  TELEGRAM_RECIPIENT_COLUMN
} = require("./telegramRecipient");

async function sendTelegramBroadcast(
  client,
  contacts,
  options = {}
) {

  return sendBroadcast(
    client,
    contacts,
    {
      ...options,
      messagingService:
        telegramService,
      recipientResolver:
        resolveTelegramRecipient
    }
  );
}

module.exports = {
  sendTelegramBroadcast,
  resolveTelegramRecipient,
  TELEGRAM_RECIPIENT_COLUMN
};
