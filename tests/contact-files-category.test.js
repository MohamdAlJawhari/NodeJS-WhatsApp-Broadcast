const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const XLSX = require("xlsx");

const {
  createContactFileService
} = require("../electron/contactFiles");

test("saved contact categories persist separately from spreadsheet content", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "broadcast-contact-category-")
  );

  try {
    const service = createContactFileService({
      app: {
        isPackaged: true,
        getPath: () => tempDir
      },
      dialog: {},
      shell: {}
    });

    const savedDir = service.ensureSavedContactsDir();
    const filePath = path.join(savedDir, "contacts.xlsx");
    const sheet = XLSX.utils.aoa_to_sheet([
      ["phone", "name"],
      ["70123456", "Test"]
    ]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, sheet, "Contacts");
    XLSX.writeFile(workbook, filePath);

    assert.equal(
      service.getSavedContactEntries()[0].category,
      "none"
    );

    service.updateSavedContactCategory(
      "contacts.xlsx",
      "telegram"
    );

    assert.equal(
      service.getSavedContactEntries()[0].category,
      "telegram"
    );

    service.updateSavedContactDetails({
      description: "Internal list",
      fileName: "contacts.xlsx",
      id: "contacts.xlsx"
    });

    const details = service.getSavedContactDetails(
      "contacts.xlsx"
    );

    assert.equal(details.category, "telegram");
    assert.equal(details.description, "Internal list");
    assert.deepEqual(details.rows, [
      ["phone", "name"],
      ["70123456", "Test"]
    ]);

    service.updateSavedContactCategory(
      "contacts.xlsx",
      "unsupported"
    );

    assert.equal(
      service.getSavedContactEntries()[0].category,
      "none"
    );
  } finally {
    fs.rmSync(tempDir, {
      force: true,
      recursive: true
    });
  }
});

test("first launch creates one editable cross-channel contact example", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "broadcast-contact-template-")
  );

  try {
    const service = createContactFileService({
      app: {
        isPackaged: true,
        getPath: () => tempDir
      },
      dialog: {},
      shell: {}
    });

    const created =
      service.ensureDefaultContactTemplate();

    assert.equal(
      created.fileName,
      "Contact File Example.xlsx"
    );
    assert.deepEqual(created.rows, [
      ["NUMBERS", "@USERNAME", "NAME", "PASSWORD"],
      [
        "15550100000",
        "@example_user",
        "Demo User",
        "demo_password"
      ]
    ]);
    assert.match(
      created.description,
      /WhatsApp and Telegram/
    );

    assert.equal(
      service.ensureDefaultContactTemplate(),
      null
    );

    fs.unlinkSync(created.filePath);

    assert.equal(
      service.ensureDefaultContactTemplate(),
      null
    );
    assert.equal(
      fs.existsSync(created.filePath),
      false
    );
  } finally {
    fs.rmSync(tempDir, {
      force: true,
      recursive: true
    });
  }
});

test("template upgrade adds demo fields to the untouched legacy example", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "broadcast-contact-template-upgrade-")
  );

  try {
    const service = createContactFileService({
      app: {
        isPackaged: true,
        getPath: () => tempDir
      },
      dialog: {},
      shell: {}
    });
    const savedDir = service.ensureSavedContactsDir();
    const filePath = path.join(
      savedDir,
      "Contact File Example.xlsx"
    );
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["NUMBERS", "@USERNAME"],
      ["15550100000", "@example_user"]
    ]);

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      "Contacts"
    );
    XLSX.writeFile(workbook, filePath);
    fs.writeFileSync(
      path.join(tempDir, "data", ".default-contact-template-v1"),
      "created\n"
    );

    const upgraded =
      service.ensureDefaultContactTemplate();

    assert.deepEqual(upgraded.rows[0], [
      "NUMBERS",
      "@USERNAME",
      "NAME",
      "PASSWORD"
    ]);
    assert.deepEqual(upgraded.rows[1], [
      "15550100000",
      "@example_user",
      "Demo User",
      "demo_password"
    ]);
  } finally {
    fs.rmSync(tempDir, {
      force: true,
      recursive: true
    });
  }
});
