const fs = require("node:fs");
const path = require("node:path");

const {
  validateTelegramConfig
} = require("../../src/services/telegramSession");

const CREDENTIALS_FILE =
  "telegram-credentials.json";

function createTelegramCredentialsService({
  runtimePaths,
  safeStorage
}) {

  function getCredentialsPath() {

    return path.join(
      runtimePaths.getWritableRootDir(),
      CREDENTIALS_FILE
    );
  }

  function ensureEncryptionAvailable() {

    if (
      !safeStorage ||
      typeof safeStorage.isEncryptionAvailable !== "function" ||
      !safeStorage.isEncryptionAvailable()
    ) {

      throw new Error(
        "Secure credential storage is not available on this computer."
      );
    }
  }

  function saveCredentials(input = {}) {

    ensureEncryptionAvailable();

    const config =
      validateTelegramConfig({
        apiId: input.apiId,
        apiHash:
          typeof input.apiHash === "string"
            ? input.apiHash.trim()
            : input.apiHash,
        sessionName: "telegram-session"
      });

    runtimePaths.ensureRuntimePaths();

    const encrypted =
      safeStorage.encryptString(
        JSON.stringify({
          apiId: config.apiId,
          apiHash: config.apiHash
        })
      );

    const credentialsPath =
      getCredentialsPath();

    fs.writeFileSync(
      credentialsPath,
      JSON.stringify({
        version: 1,
        encrypted: encrypted.toString("base64")
      }),
      {
        encoding: "utf8",
        mode: 0o600
      }
    );

    fs.chmodSync(credentialsPath, 0o600);

    return getStatus();
  }

  function loadCredentials() {

    const credentialsPath =
      getCredentialsPath();

    if (!fs.existsSync(credentialsPath)) {

      return null;
    }

    ensureEncryptionAvailable();

    try {

      const stored =
        JSON.parse(
          fs.readFileSync(credentialsPath, "utf8")
        );

      const decrypted =
        safeStorage.decryptString(
          Buffer.from(stored.encrypted, "base64")
        );

      return validateTelegramConfig({
        ...JSON.parse(decrypted),
        sessionName: "telegram-session"
      });

    } catch (_error) {

      throw new Error(
        "Saved Telegram credentials could not be decrypted. Delete them and enter them again."
      );
    }
  }

  function deleteCredentials() {

    fs.rmSync(
      getCredentialsPath(),
      {
        force: true
      }
    );

    return {
      configured: false,
      maskedApiId: ""
    };
  }

  function requireCredentials() {

    const credentials =
      loadCredentials();

    if (!credentials) {

      throw new Error(
        "Telegram credentials are not configured. Enter your API ID and API hash in Connections."
      );
    }

    return credentials;
  }

  function getStatus() {

    const credentials =
      loadCredentials();

    if (!credentials) {

      return {
        configured: false,
        maskedApiId: ""
      };
    }

    const apiId =
      String(credentials.apiId);

    return {
      configured: true,
      maskedApiId:
        `${"•".repeat(Math.max(0, apiId.length - 4))}${apiId.slice(-4)}`
    };
  }

  return {
    deleteCredentials,
    getStatus,
    loadCredentials,
    requireCredentials,
    saveCredentials
  };
}

module.exports = {
  createTelegramCredentialsService
};
