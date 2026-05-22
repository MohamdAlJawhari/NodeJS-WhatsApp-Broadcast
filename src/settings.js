const fs = require("fs");
const path = require("path");

const defaultSettings = {

  defaultTemplate:
`Hello {{name}}, your password is {{password}}, your user name was {{username}}.
مرحباً {{name}}، كلمة مرورك هي {{password}}، واسم المستخدم الخاص بك هو {{username}}.`,

  whatsappSessionName:
    "employee-session",

  sending: {
    delayMin: 10000,
    delayMax: 20000,
    batchSize: 5,
    batchPause: 30000,
    mediaRetryAttempts: 3,
    mediaRetryDelay: 15000
  }
};

let settingsPath =
  getDefaultSettingsPath();

function getDefaultSettingsPath() {

  return path.join(
    __dirname,
    "..",
    "settings.json"
  );
}

function configureSettingsPath(filePath) {

  settingsPath =
    filePath ||
    getDefaultSettingsPath();
}

function getSettingsPath() {

  return settingsPath;
}

function ensureSettingsDirectory() {

  fs.mkdirSync(
    path.dirname(settingsPath),
    {
      recursive: true
    }
  );
}

function normalizeSettings(settings = {}) {

  const incomingSending =
    settings &&
    typeof settings.sending === "object" &&
    settings.sending !== null
      ? settings.sending
      : {};

  return {
    ...defaultSettings,
    ...settings,
    sending: {
      ...defaultSettings.sending,
      ...incomingSending
    }
  };
}

function getDefaultSettings() {

  return normalizeSettings();
}

function loadSettings() {

  ensureSettingsDirectory();

  if (
    !fs.existsSync(settingsPath)
  ) {

    const settings = {
      ...defaultSettings,
      sending: {
        ...defaultSettings.sending
      }
    };

    saveSettings(settings);

    return settings;
  }

  const raw =
    fs.readFileSync(
      settingsPath,
      "utf8"
    );

  const parsedSettings =
    JSON.parse(raw);

  const settings =
    normalizeSettings(parsedSettings);

  if (
    JSON.stringify(settings) !==
    JSON.stringify(parsedSettings)
  ) {

    saveSettings(settings);
  }

  return settings;
}

function saveSettings(settings) {

  ensureSettingsDirectory();

  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      settings,
      null,
      2
    )
  );
}

module.exports = {

  configureSettingsPath,

  getSettingsPath,

  getDefaultSettings,

  normalizeSettings,

  loadSettings,

  saveSettings
};
