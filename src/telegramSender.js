const { sendBroadcast } = require("./sender");
const telegramService = require("./services/telegramService");

const {
  resolveTelegramRecipient,
  TELEGRAM_RECIPIENT_COLUMN
} = require("./telegramRecipient");

const {
  resolveTelegramSendRecipient
} = require("./telegramRecipientResolver");

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
        contact => resolveTelegramSendRecipient(
          client,
          contact
        )
    }
  );
}

module.exports = {
  sendTelegramBroadcast,
  resolveTelegramRecipient,
  resolveTelegramSendRecipient,
  TELEGRAM_RECIPIENT_COLUMN
};
