const xlsx = require("xlsx");

function loadContacts(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(
    sheet,
    {
      header: 1,
      defval: ""
    }
  );

  if (rawRows.length < 2) {
    throw new Error("Contacts file is empty.");
  }

  const headers = rawRows[0]
    .map(header => String(header).trim());

  const rows = rawRows
    .slice(1)
    .map(row => {
      const contact = {};

      headers.forEach((header, index) => {
        if (header) {
          contact[header] = String(row[index]).trim();
        }
      });

      return contact;
    })
    .filter(contact => {
      return Object.values(contact).some(value => {
        return String(value).trim() !== "";
      });
    });

  if (!rows.length) {
    throw new Error("Contacts file is empty.");
  }

  const phoneColumn =
    process.env.PHONE_COLUMN || "phone";

  const actualPhoneColumn =
    headers.includes(phoneColumn)
      ? phoneColumn
      : headers.find(header => {
        return header.toLowerCase() ===
          phoneColumn.toLowerCase();
      });

  if (!actualPhoneColumn) {

    throw new Error(
      `Contacts file must contain a '${phoneColumn}' column. Available columns: ${headers.join(", ")}.`
    );
  }

  if (actualPhoneColumn !== phoneColumn) {
    rows.forEach(row => {
      row[phoneColumn] = row[actualPhoneColumn];
    });
  }

  return rows;
}

module.exports = { loadContacts };
