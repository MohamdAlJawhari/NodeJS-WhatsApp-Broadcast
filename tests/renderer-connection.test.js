const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createClassList(
  initialClasses = []
) {
  const classes =
    new Set(initialClasses);

  return {
    add: (...classNames) => {
      classNames.forEach(className => {
        classes.add(className);
      });
    },
    contains: (className) => {
      return classes.has(className);
    },
    remove: (...classNames) => {
      classNames.forEach(className => {
        classes.delete(className);
      });
    }
  };
}

function createElement(
  innerText = ""
) {
  return {
    disabled: false,
    innerText
  };
}

function loadConnectionFactory() {
  const scriptPath =
    path.join(
      __dirname,
      "..",
      "electron",
      "renderer",
      "app",
      "connection.js"
    );

  const sandbox = {
    window: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(scriptPath, "utf8"),
    sandbox,
    {
      filename: scriptPath
    }
  );

  return sandbox
    .window
    .BroadcastRendererConnection
    .createConnectionUI;
}

test(
  "Telegram connection status applies the same card state classes as WhatsApp",
  () => {
    const createConnectionUI =
      loadConnectionFactory();

    const telegramTile = {
      classList:
        createClassList([
          "channel-card",
          "telegram-channel-card"
        ])
    };

    const dom = {
      connectBtn:
        createElement(),
      connectTelegramBtn:
        createElement(),
      connectionStatus:
        createElement(),
      connectionTile: {
        classList:
          createClassList([
            "channel-card"
          ])
      },
      telegramConnectionStatus: {
        innerText:
          "Telegram not connected",
        closest: (selector) => {
          return selector === ".channel-card"
            ? telegramTile
            : null;
        }
      }
    };

    const connectionUI =
      createConnectionUI({
        dom,
        electronAPI: {},
        qrUI: {},
        showToast: () => {}
      });

    connectionUI.setTelegramConnectionStatus(
      "Connecting..."
    );

    assert.equal(
      telegramTile.classList.contains("connection-connecting"),
      true
    );

    connectionUI.setTelegramConnectionStatus(
      "CONNECTED"
    );

    assert.equal(
      telegramTile.classList.contains("connection-connecting"),
      false
    );
    assert.equal(
      telegramTile.classList.contains("connection-connected"),
      true
    );

    connectionUI.setTelegramConnectionStatus(
      "Failed to connect"
    );

    assert.equal(
      telegramTile.classList.contains("connection-connected"),
      false
    );
    assert.equal(
      telegramTile.classList.contains("connection-error"),
      true
    );
  }
);
