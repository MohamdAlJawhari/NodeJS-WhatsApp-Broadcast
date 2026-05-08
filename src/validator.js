const {
  parsePhoneNumberFromString
} = require("libphonenumber-js");

function normalizePhone(phone) {

  // Remove spaces, -, ()
  let cleaned = String(phone)
    .trim()
    .replace(/[^\d+]/g, "");

  // Lebanon local mobile number
  // Example:
  // 81744432
  if (/^\d{8}$/.test(cleaned)) {
    cleaned = `+961${cleaned}`;
  }

  // If starts without +
  // Example:
  // 96181744432
  if (
    /^\d+$/.test(cleaned) &&
    !cleaned.startsWith("+")
  ) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

function validatePhone(phone) {

  const normalized = normalizePhone(phone);

  try {

    const phoneNumber =
      parsePhoneNumberFromString(normalized);

    if (!phoneNumber) {

      return {
        valid: false,
        reason: "Invalid phone number format"
      };
    }

    if (!phoneNumber.isValid()) {

      return {
        valid: false,
        reason: "Phone number is not valid"
      };
    }

    return {
      valid: true,
      phone: phoneNumber.number.replace("+", ""),
      international: phoneNumber.formatInternational(),
      country: phoneNumber.country
    };

  } catch (error) {

    return {
      valid: false,
      reason: error.message
    };
  }
}

function extractTemplateVariables(template) {

  const matches = [
    ...template.matchAll(/\{\{(.*?)\}\}/g)
  ];

  return matches.map(match =>
    match[1].trim()
  );
}

function validateTemplateVariables(
  template,
  contacts
) {

  const variables =
    extractTemplateVariables(template);

  const missingVariables = new Set();

  for (const contact of contacts) {

    for (const variable of variables) {

      if (
        contact[variable] === undefined
      ) {

        missingVariables.add(variable);
      }
    }
  }

  return {
    valid: missingVariables.size === 0,
    missing: [...missingVariables]
  };
}

module.exports = {
  validatePhone,
  extractTemplateVariables,
  validateTemplateVariables
};