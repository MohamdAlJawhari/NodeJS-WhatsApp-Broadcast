const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const XLSX = require("xlsx");

const { loadContacts } = require("../src/contacts");
const { validateMediaFile } = require("../src/media");
const { generateMessage } = require("../src/template");
const {
  validatePhone,
  validateTemplateVariables
} = require("../src/validator");
const {
  MESSAGING_PROVIDERS,
  normalizeMessagingProvider
} = require("../electron/main/provider");
const {
  resolveTelegramRecipient
} = require("../src/telegramRecipient");

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

test(
  "template replacement fills known placeholders and blanks missing values",
  () => {

    const message =
      generateMessage(
        "Hello {{ name }}, user {{username}}, missing {{missing}}.",
        {
          name: "Maya",
          username: "maya01"
        }
      );

    assert.equal(
      message,
      "Hello Maya, user maya01, missing ."
    );
  }
);

test(
  "template validation reports placeholders missing from contacts",
  () => {

    const result =
      validateTemplateVariables(
        "Hello {{name}} {{password}}",
        [
          {
            name: "Ali"
          }
        ]
      );

    assert.equal(result.valid, false);
    assert.deepEqual(
      result.missing,
      ["password"]
    );
  }
);

test(
  "phone validation preserves Lebanon local fallback behavior",
  () => {

    const local =
      validatePhone("81744432");

    assert.equal(local.valid, true);
    assert.equal(local.phone, "96181744432");
    assert.equal(local.country, "LB");

    const international =
      validatePhone("+96181744432");

    assert.equal(international.valid, true);
    assert.equal(
      international.phone,
      "96181744432"
    );

    const invalid =
      validatePhone("not-a-phone");

    assert.equal(invalid.valid, false);
  }
);

test(
  "contact loading accepts NUMBERS alias and filters blank rows",
  () => {

    const tempDir =
      createTempDir();

    const previousPhoneColumn =
      process.env.PHONE_COLUMN;

    process.env.PHONE_COLUMN =
      "phone";

    try {

      const filePath =
        path.join(
          tempDir,
          "contacts.xlsx"
        );

      const workbook =
        XLSX.utils.book_new();

      const sheet =
        XLSX.utils.aoa_to_sheet([
          [
            "name",
            "NUMBERS",
            "username"
          ],
          [
            "Ali",
            "+96181744432",
            "ali01"
          ],
          [
            "",
            "",
            ""
          ]
        ]);

      XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        "Contacts"
      );

      XLSX.writeFile(
        workbook,
        filePath
      );

      const contacts =
        loadContacts(filePath);

      assert.equal(contacts.length, 1);
      assert.equal(contacts[0].name, "Ali");
      assert.equal(
        contacts[0].NUMBERS,
        "+96181744432"
      );
      assert.equal(
        contacts[0].phone,
        "+96181744432"
      );

    } finally {

      if (previousPhoneColumn === undefined) {

        delete process.env.PHONE_COLUMN;

      } else {

        process.env.PHONE_COLUMN =
          previousPhoneColumn;
      }

      cleanupTempDir(tempDir);
    }
  }
);

test(
  "media validation accepts supported files and rejects unsupported or missing files",
  () => {

    const tempDir =
      createTempDir();

    try {

      const imagePath =
        path.join(
          tempDir,
          "image.jpg"
        );

      const textPath =
        path.join(
          tempDir,
          "notes.txt"
        );

      fs.writeFileSync(imagePath, "fake image");
      fs.writeFileSync(textPath, "text");

      assert.deepEqual(
        validateMediaFile(imagePath),
        {
          valid: true,
          extension: ".jpg"
        }
      );

      const unsupported =
        validateMediaFile(textPath);

      assert.equal(unsupported.valid, false);
      assert.match(
        unsupported.reason,
        /Unsupported file type/
      );

      const missing =
        validateMediaFile(
          path.join(
            tempDir,
            "missing.pdf"
          )
        );

      assert.equal(missing.valid, false);
      assert.equal(
        missing.reason,
        "Media file does not exist"
      );

    } finally {

      cleanupTempDir(tempDir);
    }
  }
);

test(
  "provider selection defaults to WhatsApp and accepts Telegram case-insensitively",
  () => {

    assert.equal(
      normalizeMessagingProvider(),
      MESSAGING_PROVIDERS.WHATSAPP
    );

    assert.equal(
      normalizeMessagingProvider(" Telegram "),
      MESSAGING_PROVIDERS.TELEGRAM
    );

    assert.throws(
      () => normalizeMessagingProvider("email"),
      /Unsupported messaging provider/
    );
  }
);

test(
  "Telegram recipient resolving prioritizes direct target, then username, then phone",
  () => {

    const direct =
      resolveTelegramRecipient({
        TELEGRAM_TO: "me",
        "@USERNAME": "ignored",
        NUMBERS: "+96181744432"
      });

    assert.equal(direct.valid, true);
    assert.equal(direct.chatId, "me");
    assert.equal(direct.recipientType, "direct");

    const username =
      resolveTelegramRecipient({
        "@USERNAME": "maya_username"
      });

    assert.equal(username.valid, true);
    assert.equal(username.chatId, "@maya_username");
    assert.equal(username.recipientType, "username");

    const phone =
      resolveTelegramRecipient({
        NUMBERS: "+96181744432"
      });

    assert.equal(phone.valid, true);
    assert.equal(phone.chatId, "+96181744432");
    assert.equal(phone.phone, "96181744432");
    assert.equal(phone.recipientType, "phone");

    const missing =
      resolveTelegramRecipient({});

    assert.equal(missing.valid, false);
    assert.match(
      missing.reason,
      /Missing Telegram recipient/
    );
  }
);
