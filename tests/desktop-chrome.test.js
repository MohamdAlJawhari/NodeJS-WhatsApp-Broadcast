const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createElement(
  innerText = ""
) {
  return {
    dataset: {},
    innerText
  };
}

function loadDesktopChromeFactory() {
  const scriptPath =
    path.join(
      __dirname,
      "..",
      "electron",
      "renderer",
      "app",
      "desktopChrome.js"
    );

  const sandbox = {
    Date,
    MutationObserver: class {
      observe() {}
    },
    clearInterval: () => {},
    setInterval: () => 1,
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
    .BroadcastRendererDesktopChrome
    .createDesktopChrome;
}

test(
  "desktop chrome shows offline for initial not connected statuses",
  () => {
    const createDesktopChrome =
      loadDesktopChromeFactory();

    const dom = {
      broadcastStatus:
        createElement("Ready"),
      connectionStatus:
        createElement("Not connected"),
      contactsCount:
        createElement("0 contacts"),
      headerTelegramBadge:
        createElement(),
      headerTelegramStatus:
        createElement(),
      headerWhatsAppBadge:
        createElement(),
      headerWhatsAppStatus:
        createElement(),
      status:
        createElement("No file selected"),
      statusBarConnection:
        createElement(),
      statusBarContacts:
        createElement(),
      statusBarReady:
        createElement(),
      statusBarTime:
        createElement(),
      telegramConnectionStatus:
        createElement("Telegram not connected")
    };

    createDesktopChrome({
      dom
    }).register();

    assert.equal(
      dom.headerWhatsAppBadge.dataset.state,
      "waiting"
    );
    assert.equal(
      dom.headerWhatsAppStatus.innerText,
      "Offline"
    );
    assert.equal(
      dom.headerTelegramBadge.dataset.state,
      "waiting"
    );
    assert.equal(
      dom.headerTelegramStatus.innerText,
      "Offline"
    );
    assert.equal(
      dom.statusBarConnection.innerText,
      "WhatsApp Offline"
    );
  }
);
