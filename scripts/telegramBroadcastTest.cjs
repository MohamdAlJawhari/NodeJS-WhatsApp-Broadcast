const path = require("path");

const dotenv = require("dotenv");

const telegramService = require("../src/services/telegramService");
const {
  loadTelegramContacts
} = require("../src/telegramContacts");
const {
  TELEGRAM_RECIPIENT_COLUMN
} = require("../src/telegramRecipient");
const {
  sendTelegramBroadcast
} = require("../src/telegramSender");

const DEFAULT_RECIPIENT = "me";
const DEFAULT_NAME = "Telegram Test";
const DEFAULT_TEMPLATE =
  "Telegram broadcast test for {{name}}";

const appRootDir =
  path.join(__dirname, "..");

dotenv.config({
  path: path.join(appRootDir, ".env"),
  quiet: true
});

async function main() {

  const options =
    parseArgs(process.argv.slice(2));

  if (options.help) {

    printUsage();
    return;
  }

  const contacts =
    options.contactsFile
      ? loadTelegramContacts(options.contactsFile)
      : [
          {
            [TELEGRAM_RECIPIENT_COLUMN]:
              options.recipient,
            name:
              options.name
          }
        ];

  const client =
    await telegramService.initialize();

  try {

    await sendTelegramBroadcast(
      client,
      contacts,
      {
        template:
          options.template,
        mediaFile:
          options.mediaFile,
        delayMin: 0,
        delayMax: 0,
        batchSize:
          contacts.length || 1,
        batchPause: 0
      }
    );

  } finally {

    await telegramService.disconnect(client);
  }
}

function parseArgs(argv) {

  const options = {
    contactsFile:
      process.env.TELEGRAM_TEST_CONTACTS || "",
    help: false,
    mediaFile:
      process.env.TELEGRAM_TEST_MEDIA || "",
    name:
      process.env.TELEGRAM_TEST_NAME || DEFAULT_NAME,
    recipient:
      process.env.TELEGRAM_TEST_RECIPIENT || DEFAULT_RECIPIENT,
    template:
      process.env.TELEGRAM_TEST_TEMPLATE || DEFAULT_TEMPLATE
  };

  for (let index = 0; index < argv.length; index++) {

    const arg =
      argv[index];

    if (
      arg === "--help" ||
      arg === "-h"
    ) {

      options.help = true;
      continue;
    }

    if (arg === "--contacts") {

      options.contactsFile =
        requireValue(argv, index, arg);
      index++;
      continue;
    }

    if (arg === "--media") {

      options.mediaFile =
        requireValue(argv, index, arg);
      index++;
      continue;
    }

    if (arg === "--name") {

      options.name =
        requireValue(argv, index, arg);
      index++;
      continue;
    }

    if (arg === "--recipient") {

      options.recipient =
        requireValue(argv, index, arg);
      index++;
      continue;
    }

    if (arg === "--template") {

      options.template =
        requireValue(argv, index, arg);
      index++;
      continue;
    }

    if (arg.startsWith("--")) {

      throw new Error(
        `Unknown option: ${arg}`
      );
    }

    options.recipient = arg;
  }

  options.contactsFile =
    normalizeOptionalPath(options.contactsFile);

  options.mediaFile =
    normalizeOptionalPath(options.mediaFile);

  return options;
}

function requireValue(argv, index, optionName) {

  const value =
    argv[index + 1];

  if (
    !value ||
    value.startsWith("--")
  ) {

    throw new Error(
      `${optionName} requires a value`
    );
  }

  return value;
}

function normalizeOptionalPath(filePath) {

  const trimmed =
    String(filePath || "").trim();

  if (!trimmed) {

    return "";
  }

  return path.resolve(appRootDir, trimmed);
}

function printUsage() {

  console.log(
    [
      "Usage:",
      "  node scripts\\telegramBroadcastTest.cjs",
      "  node scripts\\telegramBroadcastTest.cjs --recipient me",
      "  node scripts\\telegramBroadcastTest.cjs --media media\\Gigachad.jpg",
      "  node scripts\\telegramBroadcastTest.cjs --contacts path\\to\\telegram-contacts.xlsx",
      "",
      "Contacts file must include:",
      `  ${TELEGRAM_RECIPIENT_COLUMN}`,
      "",
      "Default recipient is me."
    ].join("\n")
  );
}

if (require.main === module) {

  main().catch(error => {

    console.error(
      `Telegram broadcast test failed: ${error.message}`
    );

    process.exitCode = 1;
  });
}

module.exports = {
  loadTelegramContacts,
  parseArgs,
  main
};
