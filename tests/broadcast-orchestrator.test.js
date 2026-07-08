const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createBroadcastOrchestrator
} = require("../electron/main/broadcastOrchestrator");
const broadcastController =
  require("../src/broadcastController");

function createTempDir() {

  return fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "broadcast-orchestrator-test-"
    )
  );
}

function cleanupTempDir(dirPath) {

  if (
    dirPath &&
    path.basename(dirPath).startsWith(
      "broadcast-orchestrator-test-"
    )
  ) {

    fs.rmSync(
      dirPath,
      {
        recursive: true,
        force: true
      }
    );
  }
}

function createEvent({
  throwOnSend = false
} = {}) {

  const messages = [];

  return {
    event: {
      sender: {
        isDestroyed: () => false,
        send: (channel, payload) => {
          messages.push({
            channel,
            payload
          });

          if (throwOnSend) {
            throw new Error(
              "renderer send failed"
            );
          }
        }
      }
    },
    messages
  };
}

function createSettingsService() {

  return {
    getSendingSettings: () => ({
      delayMin: 0,
      delayMax: 0,
      batchSize: 100,
      batchPause: 0,
      mediaRetryAttempts: 1,
      mediaRetryDelay: 0
    })
  };
}

function createBroadcastData() {

  return {
    provider: "whatsapp",
    contacts: [
      {
        name: "Ali",
        phone: "+96181744432"
      }
    ],
    template: "Hello {{name}}",
    mediaFile: null
  };
}

function muteConsole() {

  const originalLog =
    console.log;

  console.log = () => {};

  return () => {
    console.log =
      originalLog;
  };
}

test.beforeEach(() => {

  broadcastController.paused = false;
  broadcastController.stopped = false;
});

test.afterEach(() => {

  broadcastController.paused = false;
  broadcastController.stopped = false;
});

test(
  "orchestrator does not abort broadcast when renderer sends fail",
  async () => {

    const tempDir =
      createTempDir();

    const restoreConsole =
      muteConsole();

    try {

      let textAttempts = 0;

      const orchestrator =
        createBroadcastOrchestrator({
          runtimePaths: {
            ensureLogsDir: () => tempDir
          },
          settingsService:
            createSettingsService(),
          whatsappConnection: {
            getClient: () => ({
              sendText: async () => {
                textAttempts++;
              }
            })
          }
        });

      const { event } =
        createEvent({
          throwOnSend: true
        });

      const result =
        await orchestrator.start(
          event,
          createBroadcastData()
        );

      assert.equal(result.success, true);
      assert.equal(textAttempts, 1);
      assert.deepEqual(
        result.counters,
        {
          success: 1,
          failed: 0,
          skipped: 0
        }
      );

    } finally {

      restoreConsole();
      cleanupTempDir(tempDir);
    }
  }
);

test(
  "orchestrator rejects overlapping broadcast starts",
  async () => {

    const tempDir =
      createTempDir();

    const restoreConsole =
      muteConsole();

    let releaseSend;

    const sendGate =
      new Promise(resolve => {
        releaseSend = resolve;
      });

    try {

      const orchestrator =
        createBroadcastOrchestrator({
          runtimePaths: {
            ensureLogsDir: () => tempDir
          },
          settingsService:
            createSettingsService(),
          whatsappConnection: {
            getClient: () => ({
              sendText: async () => {
                await sendGate;
              }
            })
          }
        });

      const first =
        orchestrator.start(
          createEvent().event,
          createBroadcastData()
        );

      const second =
        await orchestrator.start(
          createEvent().event,
          createBroadcastData()
        );

      assert.deepEqual(
        second,
        {
          success: false,
          error:
            "A broadcast is already running"
        }
      );

      releaseSend();

      const firstResult =
        await first;

      assert.equal(
        firstResult.success,
        true
      );

    } finally {

      releaseSend();
      restoreConsole();
      cleanupTempDir(tempDir);
    }
  }
);

test(
  "orchestrator shows recipients in renderer live log but redacts console mirror",
  async () => {

    const tempDir =
      createTempDir();

    const originalLog =
      console.log;

    const consoleLines = [];

    console.log = (...args) => {
      consoleLines.push(
        args.join(" ")
      );
    };

    try {

      const orchestrator =
        createBroadcastOrchestrator({
          runtimePaths: {
            ensureLogsDir: () => tempDir
          },
          settingsService:
            createSettingsService(),
          whatsappConnection: {
            getClient: () => ({
              sendText: async () => {}
            })
          }
        });

      const { event, messages } =
        createEvent();

      const result =
        await orchestrator.start(
          event,
          createBroadcastData()
        );

      const rendererLogText =
        messages
          .filter(message => {
            return message.channel === "broadcast-log";
          })
          .map(message => message.payload)
          .join("\n");

      const consoleLogText =
        consoleLines.join("\n");

      assert.equal(result.success, true);
      assert.match(
        rendererLogText,
        /\+96181744432/
      );
      assert.doesNotMatch(
        consoleLogText,
        /96181744432/
      );
      assert.match(
        consoleLogText,
        /\[REDACTED_PHONE\]/
      );

    } finally {

      console.log =
        originalLog;

      cleanupTempDir(tempDir);
    }
  }
);

test(
  "orchestrator creates and disconnects Telegram client through connection service",
  async () => {

    const tempDir =
      createTempDir();

    const restoreConsole =
      muteConsole();

    const sentMessages = [];

    const telegramClient = {
      sendMessage: async (chatId, payload) => {
        sentMessages.push({
          chatId,
          payload
        });
      }
    };

    let createdClient = false;
    let disconnectedClient = null;

    try {

      const orchestrator =
        createBroadcastOrchestrator({
          runtimePaths: {
            ensureLogsDir: () => tempDir
          },
          settingsService:
            createSettingsService(),
          whatsappConnection: {
            getClient: () => null
          },
          telegramConnection: {
            createClient: async () => {
              createdClient = true;
              return telegramClient;
            },
            disconnectClient: async (client) => {
              disconnectedClient = client;
            }
          }
        });

      const result =
        await orchestrator.start(
          createEvent().event,
          {
            provider: "telegram",
            contacts: [
              {
                name: "Maya",
                TELEGRAM_TO: "@example_user"
              }
            ],
            template: "Hello {{name}}",
            mediaFile: null
          }
        );

      assert.equal(result.success, true);
      assert.equal(createdClient, true);
      assert.equal(
        disconnectedClient,
        telegramClient
      );
      assert.deepEqual(
        sentMessages,
        [
          {
            chatId: "@example_user",
            payload: {
              message: "Hello Maya"
            }
          }
        ]
      );

    } finally {

      restoreConsole();
      cleanupTempDir(tempDir);
    }
  }
);
