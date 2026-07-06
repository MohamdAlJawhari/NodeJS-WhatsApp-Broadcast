const TELEGRAM_RECIPIENT_COLUMN = "telegram_recipient";

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
  resolveTelegramRecipient,
  TELEGRAM_RECIPIENT_COLUMN
};
