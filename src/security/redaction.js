const REDACTED = "[REDACTED]";
const REDACTED_CONTACT = "[REDACTED_CONTACT]";
const REDACTED_PHONE = "[REDACTED_PHONE]";

const SENSITIVE_KEY_PATTERN =
  /(password|passcode|token|secret|session|cookie|authorization|auth|api[_-]?hash|api[_-]?key|phone|mobile|number|recipient|telegram|whatsapp|username|name|contact)/i;

const SENSITIVE_ASSIGNMENT_PATTERN =
  /\b(password|passcode|token|secret|session|cookie|authorization|auth|api[_-]?hash|api[_-]?key)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi;

const SENSITIVE_JSON_PATTERN =
  /(["'])(password|passcode|token|secret|session|cookie|authorization|auth|api[_-]?hash|api[_-]?key)\1\s*:\s*(["'])(.*?)\3/gi;

const PHONE_LIKE_PATTERN =
  /\+?\d[\d\s().-]{6,}\d/g;

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERN.test(
    String(key || "")
  );
}

function redactSensitiveValue(value, key) {
  if (isSensitiveKey(key)) {
    return value === "" ? "" : REDACTED;
  }

  return redactSensitiveText(value);
}

function redactSensitiveObject(value) {
  return redactStructuredValue(
    value,
    "",
    new WeakSet()
  );
}

function redactStructuredValue(
  value,
  key,
  seen
) {

  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  if (isSensitiveKey(key)) {
    return value === ""
      ? ""
      : REDACTED;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return REDACTED;
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.map(item => {
        return redactStructuredValue(
          item,
          "",
          seen
        );
      });
    }

    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => {
        return [
          childKey,
          redactStructuredValue(
            childValue,
            childKey,
            seen
          )
        ];
      })
    );
  }

  if (typeof value === "string") {
    return redactSensitiveText(value);
  }

  return value;
}

function redactSensitiveText(
  value,
  {
    redactPhoneLike = true
  } = {}
) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  let text = String(value);

  text = text.replace(
    SENSITIVE_JSON_PATTERN,
    (_match, quote, key, valueQuote) => {
      return `${quote}${key}${quote}:${valueQuote}${REDACTED}${valueQuote}`;
    }
  );

  text = text.replace(
    SENSITIVE_ASSIGNMENT_PATTERN,
    (_match, key) => {
      return `${key}=${REDACTED}`;
    }
  );

  if (redactPhoneLike) {
    return redactPhoneLikeText(text);
  }

  return text;
}

function redactPhoneLikeText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).replace(
    PHONE_LIKE_PATTERN,
    candidate => {
      const digits =
        candidate.replace(/\D/g, "");

      if (digits.length < 8) {
        return candidate;
      }

      return REDACTED_PHONE;
    }
  );
}

function redactContactRow(row) {
  if (
    !row ||
    typeof row !== "object"
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.keys(row).map(key => {
      const value = row[key];

      return [
        key,
        value === undefined ||
        value === null ||
        value === ""
          ? ""
          : REDACTED_CONTACT
      ];
    })
  );
}

module.exports = {
  REDACTED,
  REDACTED_CONTACT,
  REDACTED_PHONE,
  isSensitiveKey,
  redactContactRow,
  redactPhoneLikeText,
  redactSensitiveObject,
  redactSensitiveText,
  redactSensitiveValue
};
