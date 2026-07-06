const { sendBroadcast } = require("./sender");
const telegramService = require("./services/telegramService");

const TELEGRAM_RECIPIENT_COLUMN = "telegram_recipient";

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

function resolveTelegramRecipient(contact = {}) {

  const rawRecipient =
    contact[TELEGRAM_RECIPIENT_COLUMN];

  const recipient =
    String(rawRecipient ?? "").trim();

  if (!recipient) {

    return {
      valid: false,
      rawRecipient,
      reason:
        `Missing ${TELEGRAM_RECIPIENT_COLUMN}`
    };
  }

  return {
    valid: true,
    rawRecipient,
    chatId:
      recipient
  };
}

module.exports = {
  sendTelegramBroadcast,
  resolveTelegramRecipient,
  TELEGRAM_RECIPIENT_COLUMN
};
