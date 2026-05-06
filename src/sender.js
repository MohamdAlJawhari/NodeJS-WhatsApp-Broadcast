const fs = require("fs");
const path = require("path");
const { generateMessage } = require("./template");
const { sleep, randomDelay, formatPhone } = require("./utils");

async function sendBroadcast(client, contacts, options) {
  const {
    template,
    mediaFile,
    delayMin,
    delayMax,
    batchSize,
    batchPause
  } = options;

  // Ensure logs directory exists to save send results.
  const logsDir = path.join(__dirname, "..", "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  const logFile = path.join(logsDir, `send-log-${Date.now()}.json`);
  const results = [];

  console.log(`Starting broadcast to ${contacts.length} contacts...`);

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const chatId = formatPhone(contact.phone);
    const message = generateMessage(template, contact);

    try {
      console.log(`Sending to ${contact.phone}...`);

      if (mediaFile && fs.existsSync(mediaFile)) {
        await client.sendImage(
          chatId,
          mediaFile,
          path.basename(mediaFile),
          message
        );
      } else {
        await client.sendText(chatId, message);
      }

      results.push({
        phone: contact.phone,
        status: "success",
        message
      });

      console.log(`Success: ${contact.phone}`);
    } catch (error) {
      results.push({
        phone: contact.phone,
        status: "failed",
        error: error.message
      });

      console.log(`Failed: ${contact.phone}`);
      console.log(error.message);
    }

    fs.writeFileSync(logFile, JSON.stringify(results, null, 2));

    const delay = randomDelay(delayMin, delayMax);
    console.log(`Waiting ${delay / 3000}s...`);
    await sleep(delay);

    if ((i + 1) % batchSize === 0 && i + 1 < contacts.length) {
      console.log(`Batch finished. Pausing ${batchPause / 3000}s...`);
      await sleep(batchPause);
    }
  }

  console.log("Broadcast finished.");
  console.log(`Log saved to: ${logFile}`);
}

module.exports = { sendBroadcast };