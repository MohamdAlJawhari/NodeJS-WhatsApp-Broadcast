const XLSX = require("xlsx");

const {
  TELEGRAM_RECIPIENT_COLUMN
} = require("./telegramRecipient");

function loadTelegramContacts(filePath) {

  const workbook =
    XLSX.readFile(filePath);

  const sheetName =
    workbook.SheetNames[0];

  const sheet =
    workbook.Sheets[sheetName];

  const rawRows =
    XLSX.utils.sheet_to_json(
      sheet,
      {
        header: 1,
        defval: "",
        raw: false
      }
    );

  if (rawRows.length < 2) {

    throw new Error(
      "Telegram contacts file is empty."
    );
  }

  const headers =
    rawRows[0].map(header => {
      return String(header).trim();
    });

  if (!headers.includes(TELEGRAM_RECIPIENT_COLUMN)) {

    throw new Error(
      `Telegram contacts file must contain ${TELEGRAM_RECIPIENT_COLUMN} column. Available columns: ${headers.join(", ")}.`
    );
  }

  const contacts =
    rawRows
      .slice(1)
      .map(row => {

        const contact = {};

        headers.forEach((header, index) => {

          if (header) {

            contact[header] =
              String(row[index] ?? "").trim();
          }
        });

        return contact;
      })
      .filter(contact => {

        return Object
          .values(contact)
          .some(value => {
            return String(value).trim() !== "";
          });
      });

  if (!contacts.length) {

    throw new Error(
      "Telegram contacts file has no contacts."
    );
  }

  return contacts;
}

module.exports = {
  loadTelegramContacts
};
