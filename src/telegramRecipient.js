const {
  findPhoneColumn,
  getPhoneColumnRequirementLabel,
  getPhoneValue
} = require("./phoneColumn");

const {
  validatePhone
} = require("./validator");

const TELEGRAM_RECIPIENT_COLUMN = "telegram_recipient";

const TELEGRAM_USERNAME_COLUMNS = [
  "telegram_username",
  "Telegram Username",
  "username",
  "Username"
];

function resolveTelegramRecipient(contact = {}) {

  const rawRecipient =
    contact[TELEGRAM_RECIPIENT_COLUMN];

  const recipient =
    String(rawRecipient ?? "").trim();

  if (recipient) {

    return {
      valid: true,
      rawRecipient,
      chatId:
        recipient,
      recipientType:
        "direct"
    };
  }

  const usernameColumn =
    findTelegramUsernameColumn(
      Object.keys(contact)
    );

  if (usernameColumn) {

    const rawUsername =
      contact[usernameColumn];

    const username =
      String(rawUsername ?? "").trim();

    if (username) {

      return {
        valid: true,
        rawRecipient:
          rawUsername,
        chatId:
          formatTelegramUsername(username),
        recipientType:
          "username"
      };
    }
  }

  const rawPhone =
    getPhoneValue(contact);

  if (String(rawPhone ?? "").trim()) {

    const phoneValidation =
      validatePhone(rawPhone);

    if (!phoneValidation.valid) {

      return {
        valid: false,
        rawRecipient:
          rawPhone,
        reason:
          phoneValidation.reason
      };
    }

    return {
      valid: true,
      rawRecipient:
        rawPhone,
      chatId:
        `+${phoneValidation.phone}`,
      phone:
        phoneValidation.phone,
      recipientType:
        "phone"
    };
  }

  return {
    valid: false,
    rawRecipient,
    reason:
      `Missing Telegram recipient. Add ${getTelegramRecipientRequirementLabel()}.`
  };
}

function findTelegramUsernameColumn(headers) {

  const columns =
    Array.isArray(headers)
      ? headers
      : [];

  for (const candidate of TELEGRAM_USERNAME_COLUMNS) {

    const normalizedCandidate =
      normalizeColumnName(candidate);

    const match =
      columns.find(header => {

        return normalizeColumnName(header) ===
          normalizedCandidate;
      });

    if (match) {

      return match;
    }
  }

  return null;
}

function hasTelegramRecipientHeader(headers) {

  const columns =
    Array.isArray(headers)
      ? headers
      : [];

  return columns.includes(TELEGRAM_RECIPIENT_COLUMN) ||
    Boolean(findTelegramUsernameColumn(columns)) ||
    Boolean(findPhoneColumn(columns));
}

function getTelegramRecipientLabel(contact = {}) {

  const recipient =
    resolveTelegramRecipient(contact);

  if (recipient.rawRecipient) {

    return String(recipient.rawRecipient);
  }

  return recipient.valid
    ? String(recipient.chatId)
    : "";
}

function getTelegramRecipientRequirementLabel() {

  return [
    TELEGRAM_RECIPIENT_COLUMN,
    "telegram_username",
    getPhoneColumnRequirementLabel()
  ].join(", ");
}

function formatTelegramUsername(username) {

  const trimmed =
    String(username ?? "").trim();

  if (trimmed.startsWith("@")) {

    return trimmed;
  }

  return `@${trimmed}`;
}

function normalizeColumnName(columnName) {

  return String(columnName || "")
    .trim()
    .toLowerCase();
}

module.exports = {
  getTelegramRecipientLabel,
  getTelegramRecipientRequirementLabel,
  hasTelegramRecipientHeader,
  resolveTelegramRecipient,
  TELEGRAM_RECIPIENT_COLUMN,
  TELEGRAM_USERNAME_COLUMNS
};
