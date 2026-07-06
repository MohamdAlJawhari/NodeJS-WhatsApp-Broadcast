const path = require("path");
const readline = require("readline");

const dotenv = require("dotenv");
const qrcode = require("qrcode-terminal");

const {
  createTelegramLoginUrl,
  loginWithTelegramQr,
  toBase64Url
} = require("../src/services/telegramLoginService");

const appRootDir =
  path.join(__dirname, "..");

dotenv.config({
  path: path.join(appRootDir, ".env"),
  quiet: true
});

async function main() {

  const rl =
    createPrompt();

  try {

    const result =
      await loginWithTelegramQr(
        {
          onError: async (error) => {

            console.error(
              `Telegram login error: ${error.message}`
            );

            return false;
          },

          onPassword: async (hint) => {

            return askHidden(
              rl,
              hint
                ? `Telegram 2FA password (${hint}): `
                : "Telegram 2FA password: "
            );
          },

          onQrCode: async (qrCode) => {

            renderTerminalQrCode(qrCode);
          },

          onStatus: async (message) => {

            console.log(message);
          }
        }
      );

    if (result.alreadyAuthorized) {

      console.log(
        "Telegram session is already authorized."
      );

    } else {

      console.log(
        "Telegram QR login succeeded."
      );
    }

    console.log(
      `Session file: ${result.sessionPath}`
    );

  } finally {

    rl.close();
  }
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

function renderTerminalQrCode(qrCode) {

  console.log("");
  console.log(
    "Telegram login QR:"
  );

  qrcode.generate(
    qrCode.loginUrl,
    {
      small: true
    }
  );

  console.log("");
  console.log(
    "Backup login link:"
  );
  console.log(
    qrCode.loginUrl
  );
  console.log(
    `Expires at: ${qrCode.expiresAt.toLocaleString()}`
  );
  console.log("");
}

if (require.main === module) {

  main().catch(error => {

    console.error(
      `Telegram QR login failed: ${error.message}`
    );

    process.exitCode = 1;
  });
}

module.exports = {
  createTelegramLoginUrl,
  main,
  toBase64Url
};
