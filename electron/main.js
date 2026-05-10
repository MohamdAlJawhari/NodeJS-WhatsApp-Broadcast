const wppconnect =
  require("@wppconnect-team/wppconnect");

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog
} = require("electron");

const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true
});

const {
  generateMessage
} = require("../src/template");

const {
  loadContacts
} = require("../src/contacts");

let client = null;

function createWindow() {

  const win = new BrowserWindow({

    width: 1200,
    height: 800,

    webPreferences: {

      preload: path.join(
        __dirname,
        "preload.js"
      )
    }
  });

  win.loadFile(
    path.join(
      __dirname,
      "renderer",
      "index.html"
    )
  );
}

app.whenReady().then(() => {

  createWindow();
});

// Open contacts file
ipcMain.handle(
  "select-contacts-file",
  async () => {

    const result =
      await dialog.showOpenDialog({

        properties: ["openFile"],

        filters: [
          {
            name: "Spreadsheet Files",

            extensions: [
              "xlsx",
              "xls",
              "csv"
            ]
          }
        ]
      });

    if (result.canceled) {

      return {
        success: false
      };
    }

    const filePath =
      result.filePaths[0];

    try {

      const contacts =
        loadContacts(filePath);

      return {
        success: true,
        filePath,
        count: contacts.length,
        contacts
      };

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }
);

// Generate preview messages
ipcMain.handle(
  "generate-preview",
  async (_, data) => {

    const {
      contacts,
      template
    } = data;

    const preview = contacts
      .slice(0, 5)
      .map(contact => {

        return {

          phone:
            contact[
              process.env.PHONE_COLUMN ||
              "phone"
            ],

          message:
            generateMessage(
              template,
              contact
            )
        };
      });

    return preview;
  }
);

ipcMain.handle(
  "connect-whatsapp",
  async (event) => {

    try {

      client =
        await wppconnect.create({

          session:
            "employee-session",

          headless: true,

          autoClose: 0,

          catchQR: (base64Qr) => {

            event.sender.send(
              "qr-code",
              base64Qr
            );
          },

          statusFind: (status) => {

            event.sender.send(
              "connection-status",
              status
            );
          }
        });

      event.sender.send(
        "connection-status",
        "CONNECTED"
      );

      return {
        success: true
      };

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }
);