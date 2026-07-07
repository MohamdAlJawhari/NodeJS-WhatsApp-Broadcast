const {
  findPhoneColumn,
  getPhoneColumnRequirementLabel,
  getPhoneValue
} = require("./phoneColumn");

const {
  validatePhone
} = require("./validator");

const TELEGRAM_TO_COLUMN = "TELEGRAM_TO";
const LEGACY_TELEGRAM_RECIPIENT_COLUMN = "telegram_recipient";

const TELEGRAM_RECIPIENT_COLUMN = TELEGRAM_TO_COLUMN;

const TELEGRAM_RECIPIENT_COLUMNS = [
  TELEGRAM_TO_COLUMN,
  LEGACY_TELEGRAM_RECIPIENT_COLUMN
];

const TELEGRAM_USERNAME_COLUMNS = [
  "@USERNAME",
  "telegram_username",
  "Telegram Username",
  "username",
  "Username"
];

function resolveTelegramRecipient(contact = {}) {

  const recipientValue =
    getFirstColumnValue(
      contact,
      TELEGRAM_RECIPIENT_COLUMNS
    );

  const rawRecipient =
    recipientValue.rawValue;

  const recipient =
    String(rawRecipient ?? "").trim();

  if (recipient) {

    return {
      valid: true,
      rawRecipient,
      chatId:
        recipient,
      diagnostics: {
        source:
          "direct",
        column:
          recipientValue.column,
        originalValue:
          recipient,
        resolvedTarget:
          recipient
      },
      recipientType:
        "direct"
    };
  }

  const usernameValue =
    getFirstColumnValue(
      contact,
      TELEGRAM_USERNAME_COLUMNS
    );

  if (usernameValue.column) {

    const rawUsername =
      usernameValue.rawValue;

    return {
      valid: true,
      rawRecipient:
        rawUsername,
      chatId:
        formatTelegramUsername(rawUsername),
      diagnostics: {
        source:
          "username",
        column:
          usernameValue.column,
        originalValue:
          rawUsername,
        resolvedTarget:
          formatTelegramUsername(rawUsername)
      },
      recipientType:
        "username"
    };
  }

  const phoneColumn =
    findPhoneColumn(
      Object.keys(contact)
    );

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
        diagnostics: {
          source:
            "phone",
          column:
            phoneColumn,
          originalValue:
            rawPhone,
          lookupStatus:
            "invalid_phone"
        },
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
      diagnostics: {
        source:
          "phone",
        column:
          phoneColumn,
        originalValue:
          rawPhone,
        normalizedPhone:
          `+${phoneValidation.phone}`,
        lookupStatus:
          "ready_for_lookup"
      },
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

  return findColumn(
    headers,
    TELEGRAM_USERNAME_COLUMNS
  );
}

function findTelegramRecipientColumn(headers) {

  return findColumn(
    headers,
    TELEGRAM_RECIPIENT_COLUMNS
  );
}

function findColumn(headers, candidates) {

  const columns =
    Array.isArray(headers)
      ? headers
      : [];

  for (const candidate of candidates) {

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

function getFirstColumnValue(contact, candidates) {

  const columns =
    Object.keys(contact || {});

  for (const candidate of candidates) {

    const column =
      findColumn(columns, [candidate]);

    if (!column) {

      continue;
    }

    const rawValue =
      contact[column];

    if (String(rawValue ?? "").trim()) {

      return {
        column,
        rawValue
      };
    }
  }

  return {
    column: null,
    rawValue: undefined
  };
}

function hasTelegramRecipientHeader(headers) {

  const columns =
    Array.isArray(headers)
      ? headers
      : [];

  return Boolean(findTelegramRecipientColumn(columns)) ||
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
    TELEGRAM_TO_COLUMN,
    "@USERNAME",
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
  findTelegramRecipientColumn,
  findTelegramUsernameColumn,
  getTelegramRecipientLabel,
  getTelegramRecipientRequirementLabel,
  hasTelegramRecipientHeader,
  TELEGRAM_TO_COLUMN,
  resolveTelegramRecipient,
  TELEGRAM_RECIPIENT_COLUMN,
  TELEGRAM_RECIPIENT_COLUMNS,
  TELEGRAM_USERNAME_COLUMNS
};
