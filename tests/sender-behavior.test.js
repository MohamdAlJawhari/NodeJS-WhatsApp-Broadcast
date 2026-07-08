const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { sendBroadcast } = require("../src/sender");
const broadcastController =
  require("../src/broadcastController");

function createTempDir() {

  return fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "broadcast-sender-test-"
    )
  );
}

function cleanupTempDir(dirPath) {

  if (
    dirPath &&
    path.basename(dirPath).startsWith(
      "broadcast-sender-test-"
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

function createOptions(overrides = {}) {

  return {
    template: "Hello {{name}}",
    delayMin: 0,
    delayMax: 0,
    batchSize: 100,
    batchPause: 0,
    logsDir:
      overrides.logsDir,
    recipientResolver:
      contact => ({
        valid: true,
        rawRecipient:
          contact.phone,
        chatId:
          contact.phone
      }),
    ...overrides
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
  "sender retries media failures and succeeds without falling back to text",
  async () => {

    const tempDir =
      createTempDir();

    const restoreConsole =
      muteConsole();

    try {

      const mediaFile =
        path.join(
          tempDir,
          "attachment.jpg"
        );

      fs.writeFileSync(
        mediaFile,
        "fake image"
      );

      let mediaAttempts = 0;
      let textAttempts = 0;

      const messagingService = {
        sendMedia: async () => {

          mediaAttempts++;

          if (mediaAttempts < 3) {

            throw new Error(
              `temporary media failure ${mediaAttempts}`
            );
          }
        },
        sendText: async () => {
          textAttempts++;
        }
      };

      const result =
        await sendBroadcast(
          {},
          [
            {
              name: "Ali",
              phone: "+96181744432"
            }
          ],
          createOptions({
            logsDir:
              tempDir,
            mediaFile,
            mediaRetryAttempts: 3,
            mediaRetryDelay: 0,
            messagingService
          })
        );

      assert.equal(mediaAttempts, 3);
      assert.equal(textAttempts, 0);
      assert.deepEqual(
        result.counters,
        {
          success: 1,
          failed: 0,
          skipped: 0
        }
      );
      assert.ok(result.successFile);
      assert.equal(result.failedFile, null);

    } finally {

      restoreConsole();
      cleanupTempDir(tempDir);
    }
  }
);

test(
  "sender stops before processing contacts when stop flag is set",
  async () => {

    const tempDir =
      createTempDir();

    const restoreConsole =
      muteConsole();

    try {

      let textAttempts = 0;

      const messagingService = {
        sendMedia: async () => {},
        sendText: async () => {
          textAttempts++;
        }
      };

      broadcastController.stopped =
        true;

      const result =
        await sendBroadcast(
          {},
          [
            {
              name: "Ali",
              phone: "+96181744432"
            }
          ],
          createOptions({
            logsDir:
              tempDir,
            messagingService
          })
        );

      assert.equal(textAttempts, 0);
      assert.deepEqual(
        result.counters,
        {
          success: 0,
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
  "sender waits while paused and resumes sending",
  {
    timeout: 4000
  },
  async () => {

    const tempDir =
      createTempDir();

    const restoreConsole =
      muteConsole();

    try {

      let textAttempts = 0;

      const messagingService = {
        sendMedia: async () => {},
        sendText: async () => {
          textAttempts++;
        }
      };

      broadcastController.paused =
        true;

      setTimeout(
        () => {
          broadcastController.paused =
            false;
        },
        20
      );

      const startedAt =
        Date.now();

      const result =
        await sendBroadcast(
          {},
          [
            {
              name: "Ali",
              phone: "+96181744432"
            }
          ],
          createOptions({
            logsDir:
              tempDir,
            messagingService
          })
        );

      assert.ok(
        Date.now() - startedAt >= 900
      );
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
  "sender writes broadcast output through injected logger",
  async () => {

    const tempDir =
      createTempDir();

    const originalLog =
      console.log;

    const logLines = [];

    console.log = () => {
      throw new Error(
        "global console.log should not be used"
      );
    };

    try {

      const messagingService = {
        sendMedia: async () => {},
        sendText: async () => {}
      };

      const result =
        await sendBroadcast(
          {},
          [
            {
              name: "Ali",
              phone: "+96181744432"
            }
          ],
          createOptions({
            logsDir:
              tempDir,
            messagingService,
            logger: {
              log: (...args) => {
                logLines.push(
                  args.join(" ")
                );
              }
            }
          })
        );

      assert.deepEqual(
        result.counters,
        {
          success: 1,
          failed: 0,
          skipped: 0
        }
      );
      assert.ok(
        logLines.some(line => {
          return line.includes(
            "Starting broadcast"
          );
        })
      );
      assert.ok(
        logLines.some(line => {
          return line.includes(
            "Broadcast finished"
          );
        })
      );

    } finally {

      console.log =
        originalLog;

      cleanupTempDir(tempDir);
    }
  }
);

test(
  "sender can show recipients in live logs while saved logs stay redacted",
  async () => {

    const tempDir =
      createTempDir();

    const restoreConsole =
      muteConsole();

    const logLines = [];

    try {

      const messagingService = {
        sendMedia: async () => {},
        sendText: async () => {}
      };

      const result =
        await sendBroadcast(
          {},
          [
            {
              name: "Ali",
              phone: "+15555550123"
            }
          ],
          createOptions({
            logsDir:
              tempDir,
            messagingService,
            redactLiveRecipients:
              false,
            logger: {
              log: (...args) => {
                logLines.push(
                  args.join(" ")
                );
              }
            }
          })
        );

      const logFileContents =
        fs.readFileSync(
          result.logFile,
          "utf8"
        );

      assert.ok(
        logLines.some(line => {
          return line.includes(
            "+15555550123"
          );
        })
      );
      assert.doesNotMatch(
        logFileContents,
        /15555550123/
      );
      assert.match(
        logFileContents,
        /\[REDACTED_PHONE\]/
      );

    } finally {

      restoreConsole();
      cleanupTempDir(tempDir);
    }
  }
);

test(
  "sender can show Telegram-style diagnostics in live logs only",
  async () => {

    const tempDir =
      createTempDir();

    const restoreConsole =
      muteConsole();

    const logLines = [];

    try {

      const messagingService = {
        sendMedia: async () => {},
        sendText: async () => {}
      };

      const result =
        await sendBroadcast(
          {},
          [
            {
              name: "Ali",
              phone: "+15555550123"
            }
          ],
          createOptions({
            logsDir:
              tempDir,
            messagingService,
            redactLiveRecipients:
              false,
            recipientResolver:
              () => ({
                valid: true,
                rawRecipient:
                  "@example_username",
                chatId:
                  "@example_username",
                diagnostics: {
                  source: "username",
                  column: "@USERNAME",
                  originalValue: "example_username",
                  resolvedTarget: {
                    username: "example_username"
                  },
                  lookupStatus:
                    "found token=fake-token"
                }
              }),
            logger: {
              log: (...args) => {
                logLines.push(
                  args.join(" ")
                );
              }
            }
          })
        );

      const liveLogText =
        logLines.join("\n");

      const savedLogText =
        fs.readFileSync(
          result.logFile,
          "utf8"
        );

      assert.match(
        liveLogText,
        /Original value: example_username/
      );
      assert.match(
        liveLogText,
        /Resolved target: @example_username/
      );
      assert.match(
        liveLogText,
        /Sending to @example_username/
      );
      assert.doesNotMatch(
        liveLogText,
        /fake-token/
      );
      assert.doesNotMatch(
        savedLogText,
        /example_username|fake-token/
      );
      assert.match(
        savedLogText,
        /\[REDACTED_CONTACT\]/
      );

    } finally {

      restoreConsole();
      cleanupTempDir(tempDir);
    }
  }
);
