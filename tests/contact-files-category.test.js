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
