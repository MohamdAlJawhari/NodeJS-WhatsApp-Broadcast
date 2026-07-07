const path = require("path");

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

function logRecipientDiagnostics(recipient) {

  const lines =
    getRecipientDiagnosticLines(recipient);

  lines.forEach(line => {
    console.log(line);
  });
}

function getRecipientDiagnosticLines(recipient) {

  const diagnostics =
    recipient && recipient.diagnostics;

  if (!diagnostics) {

    return [];
  }

  const lines = [];

  addDiagnosticLine(
    lines,
    "Recipient source",
    diagnostics.source
  );

  addDiagnosticLine(
    lines,
    "Recipient column",
    diagnostics.column
  );

  addDiagnosticLine(
    lines,
    "Original value",
    diagnostics.originalValue
  );

  addDiagnosticLine(
    lines,
    "Normalized phone",
    diagnostics.normalizedPhone
  );

  addDiagnosticLine(
    lines,
    "Resolved target",
    diagnostics.resolvedTarget
  );

  addDiagnosticLine(
    lines,
    "Telegram lookup method",
    diagnostics.lookupMethod
  );

  addDiagnosticLine(
    lines,
    "Telegram lookup",
    diagnostics.lookupStatus
  );

  return lines;
}

function addDiagnosticLine(
  lines,
  label,
  value
) {

  const formatted =
    formatDiagnosticValue(value);

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

function formatDiagnosticValue(value) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";
  }

  if (typeof value === "string") {

    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {

    return String(value);
  }

  if (value.username) {

    return `@${value.username}`;
  }

  if (value.id) {

    return `id:${String(value.id)}`;
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

  return String(contact[key] ?? "")
    .trim();
}

function sanitizeLogText(value) {

  if (!value) {

    return "";
  }

  return String(value);
}

function formatLogPhone(phone) {

  return String(phone ?? "");
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
  formatLogPhone,
  formatRecipientDiagnosticsForLog,
  getMediaType,
  getRecipientDiagnosticLines,
  logRecipientDiagnostics,
  sanitizeLogText
};
