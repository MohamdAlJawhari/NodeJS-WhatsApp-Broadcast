const fs = require("fs");
const path = require("path");
const { generateMessage } = require("./template");
const { sleep, randomDelay, formatPhone } = require("./utils");
const { validateMediaFile, isImage } = require("./media");
const { validatePhone } = require("./validator");

async function sendBroadcast(client, contacts, options) {
  const {
    template,
    mediaFile,
    delayMin,
    delayMax,
    batchSize,
    batchPause
  } = options;

  // Ensure logs directory exists
  const logsDir = path.join(__dirname, "..", "logs");

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  const logFile = path.join(
    logsDir,
    `send-log-${Date.now()}.json`
  );

  const results = [];
  const failedNumbers = [];

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  console.log(
    `Starting broadcast to ${contacts.length} contacts...`
  );

  for (let i = 0; i < contacts.length; i++) {

    const contact = contacts[i];

    // Progress percentage
    const progress = (
      ((i + 1) / contacts.length) * 100
    ).toFixed(1);

    console.log(
      `\n[${progress}%] Processing ${i + 1}/${contacts.length}`
    );

    // Validate phone number
    const phoneValidation = validatePhone(contact.phone);

    if (!phoneValidation.valid) {

      console.log(`Skipped: ${contact.phone}`);
      console.log(phoneValidation.reason);

      skippedCount++;

      results.push({
        phone: contact.phone,
        status: "skipped",
        reason: phoneValidation.reason
      });

      continue;
    }

    const chatId = formatPhone(phoneValidation.phone);

    // Generate personalized message
    const message = generateMessage(template, contact);

    try {

      console.log(`Sending to ${contact.phone}...`);

      const mediaValidation = validateMediaFile(mediaFile);

      let mediaSent = false;
      let textSent = false;

      // Try sending media first
      if (mediaValidation.valid) {

        try {

          if (isImage(mediaValidation.extension)) {

            await client.sendImage(
              chatId,
              mediaFile,
              path.basename(mediaFile),
              message
            );

          } else {

            await client.sendFile(
              chatId,
              mediaFile,
              path.basename(mediaFile),
              message
            );

          }

          mediaSent = true;

        } catch (mediaError) {

          console.log(
            `Media failed for ${contact.phone}:`,
            mediaError.message
          );

        }
      }

      // Fallback to text if media failed
      if (!mediaSent) {

        await client.sendText(chatId, message);

        textSent = true;
      }

      // Determine final status
      let status = "failed";

      if (mediaSent) {
        status = "success";
      }

      if (textSent && !mediaSent) {
        status = "partial_success";
      }

      // Count results
      if (mediaSent || textSent) {

        successCount++;

      } else {

        failedCount++;

        failedNumbers.push(contact.phone);
      }

      results.push({
        phone: contact.phone,
        status,
        message
      });

      console.log(`${status}: ${contact.phone}`);

    } catch (error) {

      failedCount++;

      failedNumbers.push(contact.phone);

      results.push({
        phone: contact.phone,
        status: "failed",
        error: error.message
      });

      console.log(`Failed: ${contact.phone}`);
      console.log(error.message);
    }

    // Save logs continuously
    fs.writeFileSync(
      logFile,
      JSON.stringify(results, null, 2)
    );

    // Delay between messages
    const delay = randomDelay(delayMin, delayMax);

    console.log(`Waiting ${delay / 1000}s...`);

    await sleep(delay);

    // Pause after batch
    if (
      (i + 1) % batchSize === 0 &&
      i + 1 < contacts.length
    ) {

      console.log(
        `Batch finished. Pausing ${batchPause / 1000}s...`
      );

      await sleep(batchPause);
    }
  }

  // Save failed numbers
  const failedFile = path.join(
    logsDir,
    `failed-${Date.now()}.json`
  );

  fs.writeFileSync(
    failedFile,
    JSON.stringify(failedNumbers, null, 2)
  );

  // Final summary
  console.log("\n========== SUMMARY ==========");

  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Skipped: ${skippedCount}`);

  console.log("=============================\n");

  console.log("Broadcast finished.");
  console.log(`Log saved to: ${logFile}`);
}

module.exports = {
  sendBroadcast
};