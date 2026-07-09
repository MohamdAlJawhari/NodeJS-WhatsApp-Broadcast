const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const test = require("node:test");

const {
  createUpdateService
} = require("../electron/main/updateService");

function createApp({
  isPackaged = true
} = {}) {

  return {
    isPackaged,
    getVersion: () => "1.0.1"
  };
}

function createWindowSink() {

  const messages = [];

  return {
    messages,
    windows: [
      {
        webContents: {
          isDestroyed: () => false,
          send: (channel, payload) => {
            messages.push({
              channel,
              payload
            });
          }
        }
      }
    ]
  };
}

function createLoggerSink() {

  const lines = [];

  const logger = {
    debug: message => lines.push(message),
    error: message => lines.push(message),
    info: message => lines.push(message),
    warn: message => lines.push(message)
  };

  return {
    lines,
    logger
  };
}

class FakeUpdater extends EventEmitter {

  constructor() {
    super();

    this.autoDownload = null;
    this.autoInstallOnAppQuit = null;
    this.autoRunAppAfterInstall = null;
    this.allowDowngrade = null;
    this.checkCalls = 0;
    this.downloadCalls = 0;
    this.feedUrl = null;
    this.forceDevUpdateConfig = null;
    this.logger = null;
    this.quitArgs = null;
  }

  setFeedURL(options) {
    this.feedUrl =
      options;
  }

  getFeedURL() {
    return this.feedUrl;
  }

  async checkForUpdates() {
    this.checkCalls++;

    this.emit(
      "checking-for-update"
    );

    this.emit(
      "update-not-available",
      {
        version: "1.0.1"
      }
    );

    return {
      updateInfo: {
        version: "1.0.1"
      }
    };
  }

  async downloadUpdate() {
    this.downloadCalls++;

    return [
      "fake-installer.exe"
    ];
  }

  quitAndInstall(
    silent,
    forceRunAfter
  ) {
    this.quitArgs = {
      forceRunAfter,
      silent
    };
  }
}

test(
  "update service skips checks in development unless explicitly enabled",
  async () => {

    const updater =
      new FakeUpdater();

    const {
      messages,
      windows
    } = createWindowSink();

    const service =
      createUpdateService({
        app:
          createApp({
            isPackaged: false
          }),
        autoUpdater:
          updater,
        getWindows: () => windows,
        logger:
          createLoggerSink().logger
      });

    const result =
      await service.checkForUpdates();

    assert.equal(result.success, true);
    assert.equal(result.skipped, true);
    assert.equal(updater.checkCalls, 0);
    assert.equal(
      service.getStatus().status,
      "disabled"
    );
    assert.ok(
      messages.some(message => {
        return message.channel === "update-status" &&
          message.payload.status === "disabled";
      })
    );
  }
);

test(
  "update service emits sanitized update errors",
  () => {

    const updater =
      new FakeUpdater();

    const {
      messages,
      windows
    } = createWindowSink();

    const {
      lines,
      logger
    } = createLoggerSink();

    createUpdateService({
      app:
        createApp(),
      autoUpdater:
        updater,
      getWindows: () => windows,
      logger
    });

    updater.emit(
      "error",
      new Error(
        "Download failed token=fake-token for +15555550123"
      )
    );

    const errorMessage =
      messages.find(message => {
        return message.channel === "update-error";
      });

    assert.ok(errorMessage);
    assert.match(
      errorMessage.payload.message,
      /token=\[REDACTED\]/
    );
    assert.match(
      errorMessage.payload.message,
      /\[REDACTED_PHONE\]/
    );
    assert.doesNotMatch(
      JSON.stringify(messages),
      /fake-token|15555550123/
    );
    assert.doesNotMatch(
      lines.join("\n"),
      /fake-token|15555550123/
    );
  }
);

test(
  "update service installs only after an update is downloaded",
  () => {

    const updater =
      new FakeUpdater();

    const service =
      createUpdateService({
        app:
          createApp(),
        autoUpdater:
          updater,
        getWindows: () => [],
        logger:
          createLoggerSink().logger
      });

    const beforeDownload =
      service.installUpdate();

    assert.equal(
      beforeDownload.success,
      false
    );
    assert.equal(
      updater.quitArgs,
      null
    );

    updater.emit(
      "update-downloaded",
      {
        version: "1.0.2"
      }
    );

    const afterDownload =
      service.installUpdate({
        forceRunAfter: false,
        silent: false
      });

    assert.equal(
      afterDownload.success,
      true
    );
    assert.deepEqual(
      updater.quitArgs,
      {
        forceRunAfter: false,
        silent: false
      }
    );
  }
);
