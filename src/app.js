require("dotenv").config();

const { loadContacts } = require("./contacts");
const { createClient } = require("./whatsapp");
const { sendBroadcast } = require("./sender");

async function main() {
  const sessionName = process.env.SESSION_NAME || "employee-session";
  const contactsFile = process.env.CONTACTS_FILE || "./data/contacts.xlsx";
  const mediaFile = process.env.MEDIA_FILE || "";

  const template = `
Hello {{name}}, your password is {{password}}.
`;

// Loads contacts from Excel.
  const contacts = loadContacts(contactsFile);

  console.log("Contacts loaded:", contacts.length);

  console.log("\nPreview first 3 contacts:");
  contacts.slice(0, 3).forEach(contact => {
    console.log(contact);
  });

  // Opens WhatsApp and waits until it is ready.
  const client = await createClient(sessionName);

  // Sends messages in batches with delays.
  await sendBroadcast(client, contacts, {
    template,
    mediaFile,
    delayMin: Number(process.env.MESSAGE_DELAY_MIN || 8000),
    delayMax: Number(process.env.MESSAGE_DELAY_MAX || 15000),
    batchSize: Number(process.env.BATCH_SIZE || 10),
    batchPause: Number(process.env.BATCH_PAUSE || 60000)
  });
}

main().catch(error => {
  console.error("App error:", error);
});