const fs = require("fs");
const path = require("path");

const DEFAULT_SESSION_NAME = "telegram-session";

function getTelegramConfig(
  env = process.env
) {

  return {
    apiId:
      normalizeText(env.TELEGRAM_API_ID),
    apiHash:
      normalizeText(env.TELEGRAM_API_HASH),
    sessionName:
      normalizeText(env.TELEGRAM_SESSION_NAME) ||
      DEFAULT_SESSION_NAME
  };
}

function validateTelegramConfig(config) {

  const apiId =
    Number(config.apiId);

  if (
    !Number.isInteger(apiId) ||
    apiId <= 0
  ) {

    throw new Error(
      "TELEGRAM_API_ID must be a positive number."
    );
  }

  if (!config.apiHash) {

    throw new Error(
      "TELEGRAM_API_HASH is required."
    );
  }

  return {
    apiId,
    apiHash:
      config.apiHash,
    sessionName:
      config.sessionName || DEFAULT_SESSION_NAME
  };
}

function getTelegramSessionPath(options = {}) {

  const sessionName =
    sanitizeSessionName(
      options.sessionName ||
      getTelegramConfig().sessionName
    );

  return path.join(
    getTelegramSessionDir(options),
    `${sessionName}.session`
  );
}

function loadTelegramSession(options = {}) {

  const sessionPath =
    getTelegramSessionPath(options);

  if (!fs.existsSync(sessionPath)) {

    return "";
  }

  return fs.readFileSync(
    sessionPath,
    "utf8"
  );
}

function saveTelegramSession(
  sessionString,
  options = {}
) {

  const sessionPath =
    getTelegramSessionPath(options);

  fs.mkdirSync(
    path.dirname(sessionPath),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    sessionPath,
    String(sessionString || ""),
    "utf8"
  );

  return sessionPath;
}

function getTelegramSessionDir(options = {}) {

  const tokensDir =
    options.tokensDir ||
    path.join(
      __dirname,
      "..",
      "..",
      "tokens"
    );

  return path.join(
    tokensDir,
    "telegram"
  );
}

function sanitizeSessionName(value) {

  const sanitized =
    normalizeText(value)
      .replace(/[^a-zA-Z0-9._-]/g, "_");

  return sanitized ||
    DEFAULT_SESSION_NAME;
}

function normalizeText(value) {

  return String(value || "")
    .trim();
}

module.exports = {
  getTelegramConfig,
  getTelegramSessionPath,
  loadTelegramSession,
  saveTelegramSession,
  validateTelegramConfig
};
