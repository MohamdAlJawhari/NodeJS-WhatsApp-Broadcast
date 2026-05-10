const fs = require("fs");
const path = require("path");

const settingsPath =
  path.join(
    __dirname,
    "..",
    "settings.json"
  );

const defaultSettings = {

  defaultTemplate:
`Hello {{name}}, your password is {{password}}.`
};

function loadSettings() {

  if (
    !fs.existsSync(settingsPath)
  ) {

    saveSettings(defaultSettings);

    return defaultSettings;
  }

  const raw =
    fs.readFileSync(
      settingsPath,
      "utf8"
    );

  return JSON.parse(raw);
}

function saveSettings(settings) {

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

  loadSettings,

  saveSettings
};