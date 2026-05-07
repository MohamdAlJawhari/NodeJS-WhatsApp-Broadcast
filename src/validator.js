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

module.exports = {
  validatePhone
};