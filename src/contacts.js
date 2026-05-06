const xlsx = require("xlsx");

function loadContacts(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  if (!rows.length) {
    throw new Error("Contacts file is empty.");
  }

  if (!rows[0].phone) {
    throw new Error("Contacts file must contain a 'phone' column.");
  }

  return rows;
}

module.exports = { loadContacts };