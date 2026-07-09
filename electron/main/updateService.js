const {
  redactSensitiveObject,
  redactSensitiveText
} = require("../../src/security/redaction");

const UPDATE_CHANNELS = {
  available: "update-available",
  downloaded: "update-downloaded",
  error: "update-error",
  progress: "update-progress",
  status: "update-status"
};

const UPDATE_STATUSES = {
  available: "available",
  checking: "checking",
  disabled: "disabled",
  downloaded: "downloaded",
  downloading: "downloading",
  error: "error",
  idle: "idle",
  installing: "installing",
  notAvailable: "not_available"
};

function createUpdateService({
  app,
  autoUpdater,
  getWindows = () => [],
  logger = console,
  startupCheckDelayMs = 10000,
  allowDevUpdates =
    process.env.UPDATE_CHECK_IN_DEV === "true",
  feedUrl =
    process.env.UPDATE_FEED_URL || ""
}) {

  const safeLogger =
    createSafeLogger(logger);

  let activeCheckPromise = null;
  let startupTimer = null;
  let updateDownloaded = false;

  let currentStatus =
    createStatusSnapshot({
      status: UPDATE_STATUSES.idle,
      message:
        "Update service ready"
    });

  configureUpdater();
  registerUpdaterEvents();

  function configureUpdater() {

    if (!autoUpdater) {
      safeLogger.warn(
        "Updater is unavailable"
      );
      return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.autoRunAppAfterInstall = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater.forceDevUpdateConfig =
      Boolean(allowDevUpdates);
    autoUpdater.logger =
      safeLogger;

    if (feedUrl) {
      autoUpdater.setFeedURL({
        provider: "generic",
        url: feedUrl
      });

      safeLogger.info(
        "Runtime update feed configured"
      );
    }
  }

  function registerUpdaterEvents() {

    if (
      !autoUpdater ||
      typeof autoUpdater.on !== "function"
    ) {
      return;
    }

    autoUpdater.on(
      "checking-for-update",
      () => {
        setStatus(
          UPDATE_STATUSES.checking,
          "Checking for updates"
        );
      }
    );

    autoUpdater.on(
      "update-available",
      (info) => {

        const updateInfo =
          sanitizeUpdateInfo(info);

        setStatus(
          UPDATE_STATUSES.available,
          "Update available",
          {
            availableVersion:
              updateInfo.version
          }
        );

        emitToRenderers(
          UPDATE_CHANNELS.available,
          updateInfo
        );
      }
    );

    autoUpdater.on(
      "update-not-available",
      (info) => {

        const updateInfo =
          sanitizeUpdateInfo(info);

        setStatus(
          UPDATE_STATUSES.notAvailable,
          "App is up to date",
          {
            availableVersion:
              updateInfo.version
          }
        );
      }
    );

    autoUpdater.on(
      "download-progress",
      (progress) => {

        const payload =
          sanitizeProgress(progress);

        setStatus(
          UPDATE_STATUSES.downloading,
          "Downloading update",
          {
            percent:
              payload.percent
          },
          {
            log: false
          }
        );

        emitToRenderers(
          UPDATE_CHANNELS.progress,
          payload
        );
      }
    );

    autoUpdater.on(
      "update-downloaded",
      (info) => {

        updateDownloaded = true;

        const updateInfo =
          sanitizeUpdateInfo(info);

        setStatus(
          UPDATE_STATUSES.downloaded,
          "Update downloaded",
          {
            availableVersion:
              updateInfo.version,
            downloadedAt:
              new Date().toISOString(),
            percent:
              100
          }
        );

        emitToRenderers(
          UPDATE_CHANNELS.downloaded,
          updateInfo
        );
      }
    );

    autoUpdater.on(
      "error",
      (error, message) => {
        handleUpdateError(
          error,
          message
        );
      }
    );
  }

  function scheduleStartupCheck(
    delayMs = startupCheckDelayMs
  ) {

    clearTimeout(startupTimer);

    startupTimer =
      setTimeout(
        () => {
          checkForUpdates({
            manual: false
          }).catch(error => {
            handleUpdateError(error);
          });
        },
        Math.max(0, Number(delayMs) || 0)
      );

    if (
      typeof startupTimer.unref === "function"
    ) {
      startupTimer.unref();
    }

    return {
      success: true
    };
  }

  async function checkForUpdates({
    manual = true
  } = {}) {

    if (activeCheckPromise) {
      return activeCheckPromise;
    }

    const readiness =
      getUpdateReadiness();

    if (!readiness.ready) {
      setStatus(
        UPDATE_STATUSES.disabled,
        readiness.message
      );

      return {
        success: true,
        skipped: true,
        status:
          getStatus(),
        manual
      };
    }

    activeCheckPromise =
      runUpdateCheck(manual);

    try {
      return await activeCheckPromise;
    } finally {
      activeCheckPromise = null;
    }
  }

  async function runUpdateCheck(manual) {

    try {

      setStatus(
        UPDATE_STATUSES.checking,
        "Checking for updates",
        {
          lastCheckedAt:
            new Date().toISOString()
        }
      );

      const result =
        await autoUpdater.checkForUpdates();

      if (!result) {
        setStatus(
          UPDATE_STATUSES.disabled,
          "Updater did not return update information"
        );
      }

      return {
        success: true,
        result:
          sanitizeCheckResult(result),
        status:
          getStatus(),
        manual
      };

    } catch (error) {

      handleUpdateError(error);

      return {
        success: false,
        error:
          sanitizeErrorMessage(error),
        status:
          getStatus(),
        manual
      };
    }
  }

  async function downloadUpdate() {

    const readiness =
      getUpdateReadiness();

    if (!readiness.ready) {
      setStatus(
        UPDATE_STATUSES.disabled,
        readiness.message
      );

      return {
        success: false,
        error:
          readiness.message,
        status:
          getStatus()
      };
    }

    try {

      setStatus(
        UPDATE_STATUSES.downloading,
        "Downloading update"
      );

      await autoUpdater.downloadUpdate();

      return {
        success: true,
        status:
          getStatus()
      };

    } catch (error) {

      handleUpdateError(error);

      return {
        success: false,
        error:
          sanitizeErrorMessage(error),
        status:
          getStatus()
      };
    }
  }

  function installUpdate(options = {}) {

    if (!updateDownloaded) {
      return {
        success: false,
        error:
          "No downloaded update is ready to install",
        status:
          getStatus()
      };
    }

    const silent =
      options.silent !== false;

    const forceRunAfter =
      options.forceRunAfter !== false;

    setStatus(
      UPDATE_STATUSES.installing,
      "Installing update"
    );

    autoUpdater.quitAndInstall(
      silent,
      forceRunAfter
    );

    return {
      success: true,
      status:
        getStatus()
    };
  }

  function getStatus() {

    return {
      ...currentStatus
    };
  }

  function getUpdateReadiness() {

    if (!autoUpdater) {
      return {
        ready: false,
        message:
          "Updater is unavailable"
      };
    }

    if (
      !app.isPackaged &&
      !allowDevUpdates
    ) {
      return {
        ready: false,
        message:
          "Update checks run only in packaged builds"
      };
    }

    return {
      ready: true
    };
  }

  function setStatus(
    status,
    message,
    extra = {},
    {
      log = true
    } = {}
  ) {

    const normalizedExtra =
      normalizeStatusExtra(
        status,
        extra
      );

    currentStatus =
      createStatusSnapshot({
        ...currentStatus,
        ...normalizedExtra,
        status,
        message
      });

    emitToRenderers(
      UPDATE_CHANNELS.status,
      currentStatus
    );

    if (log) {
      safeLogger.info(
        `Update status: ${status} - ${currentStatus.message}`
      );
    }
  }

  function normalizeStatusExtra(
    status,
    extra
  ) {

    const normalized =
      {
        ...extra
      };

    if (
      status !== UPDATE_STATUSES.error &&
      normalized.error === undefined
    ) {
      normalized.error = null;
    }

    if (
      status !== UPDATE_STATUSES.downloaded &&
      normalized.downloadedAt === undefined
    ) {
      normalized.downloadedAt = null;
    }

    if (
      status !== UPDATE_STATUSES.downloading &&
      status !== UPDATE_STATUSES.downloaded &&
      normalized.percent === undefined
    ) {
      normalized.percent = 0;
    }

    return normalized;
  }

  function handleUpdateError(
    error,
    fallbackMessage
  ) {

    const message =
      sanitizeErrorMessage(
        error,
        fallbackMessage
      );

    setStatus(
      UPDATE_STATUSES.error,
      message,
      {
        error: message
      }
    );

    emitToRenderers(
      UPDATE_CHANNELS.error,
      {
        message
      }
    );

    safeLogger.error(
      `Update error: ${message}`
    );
  }

  function emitToRenderers(
    channel,
    payload
  ) {

    getWindows()
      .forEach(window => {

        const webContents =
          window && window.webContents;

        if (
          !webContents ||
          typeof webContents.send !== "function"
        ) {
          return;
        }

        if (
          typeof webContents.isDestroyed === "function" &&
          webContents.isDestroyed()
        ) {
          return;
        }

        try {
          webContents.send(
            channel,
            payload
          );
        } catch (error) {
          safeLogger.warn(
            `Could not send update event: ${error.message}`
          );
        }
      });
  }

  return {
    checkForUpdates,
    downloadUpdate,
    getStatus,
    installUpdate,
    scheduleStartupCheck
  };

  function createStatusSnapshot({
    status,
    message,
    availableVersion = null,
    currentVersion =
      safeGetAppVersion(app),
    downloadedAt = null,
    error = null,
    lastCheckedAt = null,
    percent = 0,
    updatedAt =
      new Date().toISOString()
  }) {

    return {
      availableVersion:
        sanitizeVersion(availableVersion),
      currentVersion:
        sanitizeVersion(currentVersion),
      downloadedAt:
        sanitizeOptionalText(downloadedAt),
      error:
        sanitizeOptionalText(error),
      lastCheckedAt:
        sanitizeOptionalText(lastCheckedAt),
      message:
        sanitizeOptionalText(message),
      percent:
        sanitizePercent(percent),
      status,
      updatedAt:
        sanitizeOptionalText(updatedAt)
    };
  }
}

function sanitizeCheckResult(result) {

  if (!result) {
    return null;
  }

  return {
    updateInfo:
      sanitizeUpdateInfo(result.updateInfo)
  };
}

function sanitizeUpdateInfo(info = {}) {

  const updateInfo =
    info.updateInfo || info;

  return {
    releaseDate:
      sanitizeOptionalText(updateInfo.releaseDate),
    releaseName:
      sanitizeOptionalText(updateInfo.releaseName),
    version:
      sanitizeVersion(updateInfo.version)
  };
}

function sanitizeProgress(progress = {}) {

  return {
    bytesPerSecond:
      sanitizeNumber(progress.bytesPerSecond),
    percent:
      sanitizePercent(progress.percent),
    total:
      sanitizeNumber(progress.total),
    transferred:
      sanitizeNumber(progress.transferred)
  };
}

function sanitizeErrorMessage(
  error,
  fallbackMessage
) {

  const message =
    fallbackMessage ||
    error?.message ||
    (error != null ? String(error) : "") ||
    "Update failed";

  return redactSensitiveText(message);
}

function sanitizeOptionalText(value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return redactSensitiveText(value);
}

function sanitizeVersion(value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return String(value)
    .replace(/[^0-9A-Za-z.+-]/g, "")
    .slice(0, 80) || null;
}

function sanitizePercent(value) {

  const numeric =
    Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, numeric)
  );
}

function sanitizeNumber(value) {

  const numeric =
    Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, numeric);
}

function safeGetAppVersion(app) {

  if (
    app &&
    typeof app.getVersion === "function"
  ) {
    return app.getVersion();
  }

  return null;
}

function createSafeLogger(logger = console) {

  function write(method, args) {

    const target =
      logger &&
      typeof logger[method] === "function"
        ? logger
        : console;

    const message =
      redactSensitiveText(
        args.map(formatLogArgument)
          .join(" ")
      );

    target[method](
      `[updates] ${message}`
    );
  }

  return {
    debug: (...args) => {
      if (
        logger &&
        typeof logger.debug === "function"
      ) {
        write("debug", args);
      }
    },
    error: (...args) => {
      write("error", args);
    },
    info: (...args) => {
      write("info", args);
    },
    warn: (...args) => {
      write("warn", args);
    }
  };
}

function formatLogArgument(arg) {

  if (arg instanceof Error) {
    return arg.message;
  }

  if (
    arg &&
    typeof arg === "object"
  ) {
    try {
      return JSON.stringify(
        redactSensitiveObject(arg)
      );
    } catch (_error) {
      return String(arg);
    }
  }

  return String(arg);
}

module.exports = {
  UPDATE_CHANNELS,
  UPDATE_STATUSES,
  createSafeLogger,
  createUpdateService,
  sanitizeErrorMessage,
  sanitizeProgress,
  sanitizeUpdateInfo
};
