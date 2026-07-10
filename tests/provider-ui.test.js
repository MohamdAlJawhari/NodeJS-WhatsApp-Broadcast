const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { normalizeSettings } = require("../src/settings");

function createElement(value = "") {
  const listeners = {};

  return {
    dataset: {},
    disabled: false,
    value,
    addEventListener(eventName, listener) {
      listeners[eventName] = listener;
    },
    dispatchEvent(event) {
      if (listeners[event.type]) return listeners[event.type](event);
    },
    setAttribute(name, nextValue) {
      this[name] = nextValue;
    },
    trigger(eventName) {
      return listeners[eventName]();
    }
  };
}

function loadProviderFactory() {
  const scriptPath = path.join(
    __dirname,
    "..",
    "electron",
    "renderer",
    "app",
    "provider.js"
  );

  const sandbox = {
    console,
    Event: class Event {
      constructor(type) {
        this.type = type;
      }
    },
    window: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(scriptPath, "utf8"), sandbox);

  return sandbox.window.BroadcastRendererProvider.createProviderUI;
}

test("provider UI preserves independent WhatsApp and Telegram template drafts", async () => {
  const providerSelect = createElement("whatsapp");
  const templateInput = createElement();
  const providerControl = createElement();
  const templatesPanel = createElement();

  const providerUI = loadProviderFactory()({
    providerControl,
    providerSelect,
    templateInput,
    templatesPanel
  });

  providerUI.register();
  providerUI.initializeChannelTemplates({
    channelTemplates: {
      telegram: "Telegram saved",
      whatsapp: "WhatsApp saved"
    }
  });

  assert.equal(templateInput.value, "WhatsApp saved");
  assert.equal(templatesPanel.dataset.channel, "whatsapp");

  templateInput.value = "WhatsApp draft";
  templateInput.dispatchEvent({ type: "input" });
  providerSelect.value = "telegram";
  await providerSelect.trigger("change");

  assert.equal(templateInput.value, "Telegram saved");
  assert.equal(providerControl.dataset.channel, "telegram");

  templateInput.value = "Telegram draft";
  templateInput.dispatchEvent({ type: "input" });
  providerSelect.value = "whatsapp";
  await providerSelect.trigger("change");

  assert.equal(templateInput.value, "WhatsApp draft");
  assert.deepEqual(
    JSON.parse(JSON.stringify(providerUI.getChannelTemplates())),
    {
      telegram: "Telegram draft",
      whatsapp: "WhatsApp draft"
    }
  );
});

test("provider UI migrates the legacy default template to both channels", () => {
  const providerSelect = createElement("whatsapp");
  const templateInput = createElement();

  const providerUI = loadProviderFactory()({
    providerSelect,
    templateInput
  });

  providerUI.register();
  providerUI.initializeChannelTemplates({
    defaultTemplate: "Legacy template"
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(providerUI.getChannelTemplates())),
    {
      telegram: "Legacy template",
      whatsapp: "Legacy template"
    }
  );
});

test("settings normalization preserves distinct channel templates", () => {
  const settings = normalizeSettings({
    defaultTemplate: "Legacy",
    channelTemplates: {
      telegram: "Telegram saved",
      whatsapp: "WhatsApp saved"
    }
  });

  assert.deepEqual(settings.channelTemplates, {
    telegram: "Telegram saved",
    whatsapp: "WhatsApp saved"
  });
});
