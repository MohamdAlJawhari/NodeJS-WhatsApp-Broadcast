const {
  configureSettingsPath,
  getDefaultSettings,
  loadSettings,
  saveSettings
} = require("../../src/settings");

function createSettingsService({
  runtimePaths,
  env = process.env
}) {

  function configureRuntimePaths() {

    runtimePaths.ensureRuntimePaths();

    configureSettingsPath(
      runtimePaths.getWritableSettingsPath()
    );
  }

  function getRuntimeSettings() {

    configureRuntimePaths();

    return loadSettings();
  }

  function getConfiguredText(
    settingsValue,
    envName,
    fallbackValue
  ) {

    const envValue =
      env[envName];

    if (
      typeof envValue === "string" &&
      envValue.trim()
    ) {

      return envValue.trim();
    }

    if (
      typeof settingsValue === "string" &&
      settingsValue.trim()
    ) {

      return settingsValue.trim();
    }

    return fallbackValue;
  }

  function getConfiguredNumber(
    settingsValue,
    envName,
    fallbackValue,
    {
      integer = true,
      minimum = 0
    } = {}
  ) {

    const envValue =
      env[envName];

    const rawValue =
      envValue !== undefined &&
      String(envValue).trim() !== ""
        ? envValue
        : settingsValue;

    const parsedValue =
      Number(rawValue);

    if (
      Number.isFinite(parsedValue) &&
      parsedValue >= minimum
    ) {

      return integer
        ? Math.floor(parsedValue)
        : parsedValue;
    }

    const parsedFallback =
      Number(fallbackValue);

    if (Number.isFinite(parsedFallback)) {

      return parsedFallback;
    }

    return minimum;
  }

  function getSessionName() {

    const settings =
      getRuntimeSettings();

    const defaults =
      getDefaultSettings();

    return getConfiguredText(
      settings.whatsappSessionName,
      "SESSION_NAME",
      defaults.whatsappSessionName
    );
  }

  function getSendingSettings() {

    const settings =
      getRuntimeSettings();

    const defaults =
      getDefaultSettings();

    const sending =
      settings.sending || {};

    const defaultSending =
      defaults.sending;

    const delayMin =
      getConfiguredNumber(
        sending.delayMin,
        "MESSAGE_DELAY_MIN",
        defaultSending.delayMin
      );

    const delayMax =
      Math.max(
        delayMin,
        getConfiguredNumber(
          sending.delayMax,
          "MESSAGE_DELAY_MAX",
          defaultSending.delayMax
        )
      );

    return {
      delayMin,
      delayMax,
      batchSize:
        getConfiguredNumber(
          sending.batchSize,
          "BATCH_SIZE",
          defaultSending.batchSize,
          {
            minimum: 1
          }
        ),
      batchPause:
        getConfiguredNumber(
          sending.batchPause,
          "BATCH_PAUSE",
          defaultSending.batchPause
        ),
      mediaRetryAttempts:
        getConfiguredNumber(
          sending.mediaRetryAttempts,
          "MEDIA_RETRY_ATTEMPTS",
          defaultSending.mediaRetryAttempts,
          {
            minimum: 1
          }
        ),
      mediaRetryDelay:
        getConfiguredNumber(
          sending.mediaRetryDelay,
          "MEDIA_RETRY_DELAY",
          defaultSending.mediaRetryDelay
        )
    };
  }

  function loadRuntimeSettings() {

    configureRuntimePaths();

    return loadSettings();
  }

  function saveDefaultTemplate(template) {

    configureRuntimePaths();

    const settings =
      loadSettings();

    settings.defaultTemplate =
      template;

    saveSettings(settings);

    return {
      success: true
    };
  }

  return {
    configureRuntimePaths,
    getRuntimeSettings,
    getSendingSettings,
    getSessionName,
    loadRuntimeSettings,
    saveDefaultTemplate
  };
}

module.exports = {
  createSettingsService
};
