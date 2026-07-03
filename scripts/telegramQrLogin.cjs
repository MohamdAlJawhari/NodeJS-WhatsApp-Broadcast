const path = require("path");
const readline = require("readline");

const dotenv = require("dotenv");
const qrcode = require("qrcode-terminal");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const {
  getTelegramConfig,
  getTelegramSessionPath,
  loadTelegramSession,
  saveTelegramSession,
  validateTelegramConfig
} = require("../src/services/telegramSession");

const appRootDir =
  path.join(__dirname, "..");

dotenv.config({
  path: path.join(appRootDir, ".env"),
  quiet: true
});

async function main() {

  const config =
    validateTelegramConfig(
      getTelegramConfig()
    );

  const sessionOptions = {
    sessionName:
      config.sessionName
  };

  const session =
    new StringSession(
      loadTelegramSession(sessionOptions)
    );

  const client =
    new TelegramClient(
      session,
      config.apiId,
      config.apiHash,
      {
        connectionRetries: 5
      }
    );

  const rl =
    createPrompt();

  try {

    console.log(
      "Connecting to Telegram..."
    );

    await client.connect();

    if (await client.isUserAuthorized()) {

      saveCurrentSession(
        client,
        sessionOptions
      );

      console.log(
        "Telegram session is already authorized."
      );

      console.log(
        `Session file: ${getTelegramSessionPath(sessionOptions)}`
      );

      return;
    }

    console.log(
      "Use Telegram mobile: Settings > Devices > Link Desktop Device."
    );

    await client.signInUserWithQrCode(
      {
        apiId:
          config.apiId,
        apiHash:
          config.apiHash
      },
      {
        qrCode: async (qrCode) => {

          const loginUrl =
            createTelegramLoginUrl(qrCode.token);

          console.log("");
          console.log(
            "Telegram login QR:"
          );

          qrcode.generate(
            loginUrl,
            {
              small: true
            }
          );

          console.log("");
          console.log(
            "Backup login link:"
          );
          console.log(
            loginUrl
          );
          console.log(
            `Expires at: ${new Date(qrCode.expires * 1000).toLocaleString()}`
          );
          console.log("");
        },

        password: async (hint) => {

          return askHidden(
            rl,
            hint
              ? `Telegram 2FA password (${hint}): `
              : "Telegram 2FA password: "
          );
        },

        onError: async (error) => {

          console.error(
            `Telegram login error: ${error.message}`
          );

          return false;
        }
      }
    );

    saveCurrentSession(
      client,
      sessionOptions
    );

    console.log(
      "Telegram QR login succeeded."
    );

    console.log(
      `Session saved: ${getTelegramSessionPath(sessionOptions)}`
    );

  } finally {

    rl.close();

    await client.disconnect();
  }
}

function saveCurrentSession(
  client,
  sessionOptions
) {

  return saveTelegramSession(
    client.session.save(),
    sessionOptions
  );
}

function createPrompt() {

  const rl =
    readline.createInterface({
      input:
        process.stdin,
      output:
        process.stdout,
      terminal:
        true
    });

  rl.stdoutMuted = false;

  rl._writeToOutput = function writeToOutput(
    text
  ) {

    if (rl.stdoutMuted) {

      rl.output.write("*");
      return;
    }

    rl.output.write(text);
  };

  return rl;
}

function askHidden(
  rl,
  question
) {

  return new Promise(resolve => {

    rl.output.write(question);
    rl.stdoutMuted = true;

    rl.question("", answer => {

      rl.stdoutMuted = false;
      rl.output.write("\n");
      resolve(answer);
    });
  });
}

function toBase64Url(buffer) {

  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createTelegramLoginUrl(token) {

  return `tg://login?token=${toBase64Url(token)}`;
}

main().catch(error => {

  console.error(
    `Telegram QR login failed: ${error.message}`
  );

  process.exitCode = 1;
});
