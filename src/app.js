require("dotenv").config();

const { loadContacts } = require("./contacts");
const { createClient } = require("./whatsapp");
const { sendBroadcast } = require("./sender");
const { validatePhone } = require("./validator");

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

  // Validates media file if provided.
  const readline = require("readline");

  // Shows message preview and asks for confirmation before sending.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n========== PREVIEW ==========");

  contacts.slice(0, 3).forEach(contact => {

    const previewMessage = template
      .replace(/\{\{name\}\}/g, contact.name)
      .replace(/\{\{password\}\}/g, contact.password);

    console.log("\n----------------");
    const phoneField =
      process.env.PHONE_COLUMN || "phone";

    const validation = validatePhone(
      contact[phoneField]
    );

    console.log(
      "Phone:",
      validation.valid
        ? validation.international
        : contact.phone
    );
    console.log(previewMessage);

  });

  console.log("\n=============================");

  const answer = await new Promise(resolve => {
    rl.question(
      "\nStart sending? (yes/no): ",
      resolve
    );
  });

  rl.close();

  if (answer.toLowerCase() !== "yes") {
    console.log("Broadcast canceled.");
    return;
  }
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