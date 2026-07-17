const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createTelegramCredentialsService } =
  require("../electron/main/telegramCredentialsService");

function createFixture() {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "telegram-credentials-test-")
  );
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: value =>
      Buffer.from(value, "utf8").map(byte => byte ^ 0xaa),
    decryptString: value =>
      value.map(byte => byte ^ 0xaa).toString("utf8")
  };
  const runtimePaths = {
    ensureRuntimePaths: () => fs.mkdirSync(rootDir, { recursive: true }),
    getWritableRootDir: () => rootDir
  };
  return {
    rootDir,
    service: createTelegramCredentialsService({ runtimePaths, safeStorage })
  };
}

test("Telegram credentials are encrypted, masked and never stored as plaintext", () => {
  const fixture = createFixture();
  try {
    const status = fixture.service.saveCredentials({
      apiId: "12345678",
      apiHash: "0123456789abcdef0123456789abcdef"
    });
    assert.deepEqual(status, {
      configured: true,
      maskedApiId: "••••5678"
    });
    const stored = fs.readFileSync(
      path.join(fixture.rootDir, "telegram-credentials.json"),
      "utf8"
    );
    assert.equal(stored.includes("12345678"), false);
    assert.equal(stored.includes("0123456789abcdef"), false);
    assert.equal(fixture.service.requireCredentials().apiId, 12345678);
  } finally {
    fs.rmSync(fixture.rootDir, { recursive: true, force: true });
  }
});

test("Telegram credentials can be replaced and deleted", () => {
  const fixture = createFixture();
  try {
    fixture.service.saveCredentials({ apiId: 11111, apiHash: "first" });
    fixture.service.saveCredentials({ apiId: 22222, apiHash: "second" });
    assert.equal(fixture.service.requireCredentials().apiId, 22222);
    assert.deepEqual(fixture.service.deleteCredentials(), {
      configured: false,
      maskedApiId: ""
    });
    assert.throws(
      () => fixture.service.requireCredentials(),
      /not configured/
    );
  } finally {
    fs.rmSync(fixture.rootDir, { recursive: true, force: true });
  }
});

test("Telegram credentials reject invalid values", () => {
  const fixture = createFixture();
  try {
    assert.throws(
      () => fixture.service.saveCredentials({ apiId: "", apiHash: "hash" }),
      /is required/
    );
    assert.throws(
      () => fixture.service.saveCredentials({ apiId: "12345", apiHash: "" }),
      /API_HASH is required/
    );
  } finally {
    fs.rmSync(fixture.rootDir, { recursive: true, force: true });
  }
});
