const {
  getTelegramRecipientRequirementLabel,
  resolveTelegramRecipient
} = require("../../src/telegramRecipient");

const {
  validatePhone,
  validateTemplateVariables
} = require("../../src/validator");

const {
  validateMediaFile
} = require("../../src/media");

const {
  getPhoneValue
} = require("../../src/phoneColumn");

const {
  MESSAGING_PROVIDERS,
  normalizeMessagingProvider
} = require("./provider");

function buildValidationWarnings(data = {}) {

  const provider =
    normalizeMessagingProvider(data.provider);

  const contacts =
    Array.isArray(data.contacts)
      ? data.contacts
      : [];

  const template =
    String(data.template || "");

  const mediaFile =
    data.mediaFile || null;

  const warnings = [];
  const recipientValidation =
    buildRecipientValidationSummary(
      provider,
      contacts
    );

  const mediaValidation =
    mediaFile
      ? validateMediaFile(mediaFile)
      : null;
  const hasValidMedia =
    Boolean(mediaValidation?.valid);

  if (contacts.length === 0) {

    warnings.push({
      type: "error",
      title: "No contacts loaded",
      message:
        "Add or select a contacts file before starting a broadcast."
    });
  }

  if (
    contacts.length > 0 &&
    recipientValidation.validCount === 0
  ) {

    warnings.push({
      type: "error",
      title:
        recipientValidation.noValidTitle,
      message:
        recipientValidation.noValidMessage
    });
  }

  if (recipientValidation.invalid.length > 0) {

    warnings.push({
      type: "warning",
      title:
        recipientValidation.invalidTitle,
      message:
        `${recipientValidation.invalid.length} contact(s) will be skipped during sending.`,
      details: recipientValidation.invalid
        .map(item => {
          return `Row ${item.row}: ${item.value || "(blank)"} - ${item.reason}`;
        })
    });
  }

  if (recipientValidation.duplicates.length > 0) {

    warnings.push({
      type: "warning",
      title:
        recipientValidation.duplicateTitle,
      message:
        `${recipientValidation.duplicates.length} duplicate contact(s) may receive repeated messages.`,
      details: recipientValidation.duplicates
        .map(item => {
          return `Row ${item.row}: ${item.value}`;
        })
    });
  }

  if (!template.trim() && !hasValidMedia) {

    warnings.push({
      type: "error",
      title: "Empty message",
      message:
        "Add a message template or choose a valid media file before sending."
    });

  } else if (!template.trim() && hasValidMedia) {

    warnings.push({
      type: "warning",
      title: "Empty message template",
      message:
        "The selected media will be sent without a caption."
    });
  }

  const templateValidation =
    validateTemplateVariables(
      template,
      contacts
    );

  if (!templateValidation.valid) {

    warnings.push({
      type: "warning",
      title: "Missing template variables",
      message:
        "Some placeholders are not present in the contacts file and will be blank.",
      details: templateValidation.missing
        .map(variable => {
          return `{{${variable}}}`;
        })
    });
  }

  if (mediaFile && mediaValidation) {

    if (!mediaValidation.valid) {

      warnings.push({
        type: "error",
        title: "Media file cannot be sent",
        message:
          `${mediaValidation.reason}. Remove the selected media or choose a supported file before starting.`
      });
    }
  }

  return {
    valid:
      !warnings.some(warning => {
        return warning.type === "error";
      }),
    warnings,
    summary: {
      provider,
      totalContacts: contacts.length,
      validPhones:
        recipientValidation.validCount,
      invalidPhones:
        recipientValidation.invalid.length,
      duplicatePhones:
        recipientValidation.duplicates.length,
      validRecipients:
        recipientValidation.validCount,
      invalidRecipients:
        recipientValidation.invalid.length,
      duplicateRecipients:
        recipientValidation.duplicates.length
    }
  };
}

function buildRecipientValidationSummary(
  provider,
  contacts
) {

  if (provider === MESSAGING_PROVIDERS.TELEGRAM) {

    return buildTelegramRecipientValidationSummary(
      contacts
    );
  }

  return buildWhatsAppRecipientValidationSummary(
    contacts
  );
}

function buildWhatsAppRecipientValidationSummary(
  contacts
) {

  const invalid = [];
  const duplicates = [];
  const seenPhones = new Set();

  contacts.forEach((contact, index) => {

    const rawPhone =
      getPhoneValue(contact);

    const validation =
      validatePhone(rawPhone);

    if (!validation.valid) {

      invalid.push({
        row: index + 2,
        value: String(rawPhone || ""),
        reason: validation.reason
      });

      return;
    }

    if (seenPhones.has(validation.phone)) {

      duplicates.push({
        row: index + 2,
        value: String(rawPhone)
      });

      return;
    }

    seenPhones.add(validation.phone);
  });

  return {
    duplicateTitle:
      "Duplicate phone numbers",
    duplicates,
    invalid,
    invalidTitle:
      "Invalid phone numbers",
    noValidMessage:
      "Fix the contacts file before starting a broadcast.",
    noValidTitle:
      "No valid phone numbers",
    validCount:
      seenPhones.size
  };
}

function buildTelegramRecipientValidationSummary(
  contacts
) {

  const invalid = [];
  const duplicates = [];
  const seenRecipients = new Set();

  contacts.forEach((contact, index) => {

    const validation =
      resolveTelegramRecipient(contact);

    const rawRecipient =
      validation.rawRecipient;

    if (!validation.valid) {

      invalid.push({
        row: index + 2,
        value:
          String(rawRecipient || ""),
        reason:
          validation.reason
      });

      return;
    }

    const recipientKey =
      String(validation.chatId)
        .trim()
        .toLowerCase();

    if (seenRecipients.has(recipientKey)) {

      duplicates.push({
        row: index + 2,
        value:
          String(rawRecipient)
      });

      return;
    }

    seenRecipients.add(recipientKey);
  });

  return {
    duplicateTitle:
      "Duplicate Telegram recipients",
    duplicates,
    invalid,
    invalidTitle:
      "Invalid Telegram recipients",
    noValidMessage:
      `Fix the contacts file before starting a Telegram broadcast. It must contain ${getTelegramRecipientRequirementLabel()}.`,
    noValidTitle:
      "No valid Telegram recipients",
    validCount:
      seenRecipients.size
  };
}

module.exports = {
  buildRecipientValidationSummary,
  buildTelegramRecipientValidationSummary,
  buildValidationWarnings,
  buildWhatsAppRecipientValidationSummary
};
