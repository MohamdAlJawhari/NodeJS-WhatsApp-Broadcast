const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createWhatsAppConnectionService
} = require("../electron/main/whatsappConnection");

function createIpcEvent() {
  const messages = [];

  return {
    event: {
      sender: {
        send: (channel, payload) => {
          messages.push({
            channel,
            payload
          });
        }
      }
    },
    messages
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

test(
  "WhatsApp connection coalesces concurrent connect calls",
  async () => {

    let createCalls = 0;
    let releaseCreate;

    const createGate =
      new Promise(resolve => {
        releaseCreate = resolve;
      });

    const fakeClient = {
      isConnected: async () => true
    };

    const service =
      createWhatsAppConnectionService({
        app: {
          isPackaged: false
        },
        runtimePaths: {
          getTokensDir: () => "fake-tokens"
        },
        settingsService: {
          configureRuntimePaths: () => {},
          getSessionName: () => "fake-session"
        },
        wppconnect: {
          create: async () => {
            createCalls++;

            await createGate;

            return fakeClient;
          }
        }
      });

    const first =
      createIpcEvent();

    const second =
      createIpcEvent();

    const restoreConsole =
      muteConsole();

    try {

      const firstConnect =
        service.connect(first.event);

      assert.equal(createCalls, 1);

      const secondConnect =
        service.connect(second.event);

      assert.equal(createCalls, 1);

      releaseCreate();

      const results =
        await Promise.all([
          firstConnect,
          secondConnect
        ]);

      assert.deepEqual(
        results,
        [
          {
            success: true
          },
          {
            success: true
          }
        ]
      );

      assert.equal(createCalls, 1);
      assert.equal(
        service.getClient(),
        fakeClient
      );
      assert.ok(
        first.messages.some(message => {
          return message.channel === "connection-status" &&
            message.payload === "CONNECTED";
        })
      );
      assert.ok(
        second.messages.some(message => {
          return message.channel === "connection-status" &&
            message.payload === "CONNECTED";
        })
      );

    } finally {

      restoreConsole();
    }
  }
);
