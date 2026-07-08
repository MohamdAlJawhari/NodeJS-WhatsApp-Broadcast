const path = require("path");
const {
  REDACTED_CONTACT,
  redactPhoneLikeText,
  redactSensitiveText
} = require("../security/redaction");

function createContactLogEntry({
  contact,
  index,
  rawPhone,
  recipient,
  status,
  reason,
  error,
  warning,
  mediaSelected = false,
  mediaType = ""
}) {

  return {
    timestamp:
      new Date().toISOString(),
    rowNumber:
      index + 2,
    contactId:
      getContactId(contact),
    phone:
      formatLogPhone(rawPhone),
    recipientSource:
      sanitizeLogText(
        getRecipientDiagnosticSource(recipient)
      ),
    recipientDetails:
      sanitizeLogText(
        formatRecipientDiagnosticsForLog(recipient)
      ),
    status,
    reason:
      sanitizeLogText(reason),
    error:
      sanitizeLogText(error),
    warning:
      sanitizeLogText(warning),
    mediaSelected:
      Boolean(mediaSelected),
    mediaType:
      mediaSelected
        ? mediaType
        : ""
  };
}

function logRecipientDiagnostics(
  recipient,
  logger = console,
  options = {}
) {

  const lines =
    getRecipientDiagnosticLines(
      recipient,
      options
    );

  const log =
    createLogger(logger);

  lines.forEach(line => {
    log(line);
  });
}

function createLogger(logger) {

  if (typeof logger === "function") {

    return logger;
  }

  if (
    logger &&
    typeof logger.log === "function"
  ) {

    return logger.log.bind(logger);
  }

  return console.log.bind(console);
}

function getRecipientDiagnosticLines(
  recipient,
  {
    redactRecipientValues = true
  } = {}
) {

  const diagnostics =
    recipient && recipient.diagnostics;

  if (!diagnostics) {

    return [];
  }

  const lines = [];

  addDiagnosticLine(
    lines,
    "Recipient source",
    diagnostics.source,
    {
      redactRecipientValues
    }
  );

  addDiagnosticLine(
    lines,
    "Recipient column",
    diagnostics.column,
    {
      redactRecipientValues
    }
  );

  addDiagnosticLine(
    lines,
    "Original value",
    diagnostics.originalValue,
    {
      redactRecipientValues
    }
  );

  addDiagnosticLine(
    lines,
    "Normalized phone",
    diagnostics.normalizedPhone,
    {
      redactRecipientValues
    }
  );

  addDiagnosticLine(
    lines,
    "Resolved target",
    diagnostics.resolvedTarget,
    {
      redactRecipientValues
    }
  );

  addDiagnosticLine(
    lines,
    "Telegram lookup method",
    diagnostics.lookupMethod,
    {
      redactRecipientValues
    }
  );

  addDiagnosticLine(
    lines,
    "Telegram lookup",
    diagnostics.lookupStatus,
    {
      redactRecipientValues
    }
  );

  return lines;
}

function addDiagnosticLine(
  lines,
  label,
  value,
  options = {}
) {

  const formatted =
    formatDiagnosticValue(
      value,
      label,
      options
    );

  if (formatted) {

    lines.push(`${label}: ${formatted}`);
  }
}

function getRecipientDiagnosticSource(recipient) {

  return recipient &&
    recipient.diagnostics &&
    recipient.diagnostics.source;
}

function formatRecipientDiagnosticsForLog(recipient) {

  return getRecipientDiagnosticLines(recipient)
    .join("; ");
}

function formatDiagnosticValue(
  value,
  label = "",
  {
    redactRecipientValues = true
  } = {}
) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";
  }

  if (
    isSensitiveDiagnosticLabel(label) &&
    redactRecipientValues
  ) {

    return redactRecipientValue(value);
  }

  if (isSensitiveDiagnosticLabel(label)) {

    return formatLiveDiagnosticValue(value);
  }

  if (typeof value === "string") {

    return redactSensitiveText(value.trim());
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {

    return String(value);
  }

  if (value.username) {

    return REDACTED_CONTACT;
  }

  if (value.id) {

    return REDACTED_CONTACT;
  }

  return "";
}

function formatLiveDiagnosticValue(value) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";
  }

  if (typeof value === "string") {

    return redactSensitiveText(
      value.trim(),
      {
        redactPhoneLike: false
      }
    );
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {

    return String(value);
  }

  if (value.username) {

    return `@${redactSensitiveText(
      value.username,
      {
        redactPhoneLike: false
      }
    )}`;
  }

  if (value.id) {

    return `id:${redactSensitiveText(
      String(value.id),
      {
        redactPhoneLike: false
      }
    )}`;
  }

  return "";
}

function getContactId(contact = {}) {

  const keys = [
    "id",
    "ID",
    "contactId",
    "contact_id",
    "Contact ID"
  ];

  const key =
    keys.find(candidate => {
      return Object.prototype.hasOwnProperty.call(
        contact,
        candidate
      );
    });

  if (!key) {

    return "";
  }

  const contactId =
    String(contact[key] ?? "")
      .trim();

  return contactId
    ? REDACTED_CONTACT
    : "";
}

function sanitizeLogText(value) {

  if (!value) {

    return "";
  }

  return redactSensitiveText(value);
}

function formatLogPhone(phone) {

  return redactRecipientValue(phone);
}

function formatLiveLogRecipient(recipient) {

  if (
    recipient === undefined ||
    recipient === null
  ) {

    return "";
  }

  const text =
    String(recipient).trim();

  if (!text) {

    return "";
  }

  return redactSensitiveText(
    text,
    {
      redactPhoneLike: false
    }
  );
}

function redactRecipientValue(value) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";
  }

  const text =
    String(value).trim();

  if (!text) {

    return "";
  }

  const redacted =
    redactPhoneLikeText(text);

  return redacted === text
    ? REDACTED_CONTACT
    : redacted;
}

function isSensitiveDiagnosticLabel(label) {

  return /original|phone|target/i.test(
    String(label || "")
  );
}

function getMediaType(mediaFile) {

  if (!mediaFile) {

    return "";
  }

  return path.extname(mediaFile)
    .toLowerCase() || "unknown";
}

function createLogRunId() {

  const now =
    new Date();

  const pad = value => {
    return String(value).padStart(2, "0");
  };

  const date =
    [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate())
    ].join("-");

  const time =
    [
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds())
    ].join("-");

  return `${date}_${time}`;
}

module.exports = {
  createContactLogEntry,
  createLogRunId,
  formatLiveLogRecipient,
  formatLogPhone,
  formatRecipientDiagnosticsForLog,
  getMediaType,
  getRecipientDiagnosticLines,
  logRecipientDiagnostics,
  sanitizeLogText
};
