const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { generateMessage } = require("./template");
const { sleep, randomDelay, formatPhone } = require("./utils");
const { validateMediaFile, isImage } = require("./media");
const { validatePhone } = require("./validator");
const broadcastController = require("./broadcastController");
const { createObjectCsvWriter } = require("csv-writer");

async function sendBroadcast(client, contacts, options) {
  const {
    template,
    mediaFile,
    delayMin,
    delayMax,
    batchSize,
    batchPause,
    onProgress,
    onCountersUpdate,
    logsDir:
      customLogsDir
  } = options;

  // Ensure logs directory exists
  const logsDir =
    customLogsDir ||
    path.join(__dirname, "..", "logs");

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, {
      recursive: true
    });
  }

  const logFile = path.join(
    logsDir,
    `send-log-${Date.now()}.json`
  );

  let failedFile = null;
  let successFile = null;

  const results = [];
  const failedContacts = [];
  const successContacts = [];

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  const getCounters = () => ({
    success: successCount,
    failed: failedCount,
    skipped: skippedCount
  });

  const emitCounters = () => {
    if (onCountersUpdate) {
      onCountersUpdate(getCounters());
    }
  };

  const emitProgress = (current, total) => {
    if (onProgress) {
      onProgress(current, total);
    }
  };

  console.log(
    `Starting broadcast to ${contacts.length} contacts...`
  );

  emitCounters();

  // process.stdin.setRawMode(true);
  // process.stdin.resume();
  // process.stdin.setEncoding("utf8");

  // process.stdin.on("data", key => {

  //   // CTRL + C
  //   if (key === "\u0003") {
  //     process.exit();
  //   }

  //   // Pause
  //   if (key.toLowerCase() === "p") {

  //     paused = true;

  //     console.log(
  //       "\n=== BROADCAST PAUSED ==="
  //     );
  //   }

  //   // Resume
  //   if (key.toLowerCase() === "r") {

  //     paused = false;

  //     console.log(
  //       "\n=== BROADCAST RESUMED ==="
  //     );
  //   }

  //   // Stop completely
  //   if (key.toLowerCase() === "q") {

  //     stopped = true;

  //     console.log(
  //       "\n=== STOPPING BROADCAST ==="
  //     );
  //   }
  // });


  for (let i = 0; i < contacts.length; i++) {
    if (broadcastController.stopped) {
      console.log(
        "Broadcast stopped"
      );

      break;
    }

    while (broadcastController.paused) {

      console.log(
        "Broadcast paused. Waiting to resume..."
      );
      await sleep(1000);
    }

    if (broadcastController.stopped) {
      console.log(
        "Broadcast stopped"
      );

      break;
    }

    const contact = contacts[i];

    const phoneField =
      process.env.PHONE_COLUMN || "phone";

    const rawPhone =
      contact[phoneField];


    const progress = (
      ((i + 1) / contacts.length) * 100
    ).toFixed(1);

    console.log(
      `\n[${progress}%] Processing ${i + 1}/${contacts.length}`
    );

    // Validate phone number
    const phoneValidation = validatePhone(rawPhone);

    if (!phoneValidation.valid) {

      console.log(`Skipped: ${rawPhone}`);
      console.log(phoneValidation.reason);

      skippedCount++;

      results.push({
        phone: rawPhone,
        status: "skipped",
        reason: phoneValidation.reason
      });

      // Save invalid contacts for retry/fixing
      failedContacts.push(contact);

      emitCounters();
      emitProgress(i + 1, contacts.length);

      fs.writeFileSync(
        logFile,
        JSON.stringify(results, null, 2)
      );

      continue;
    }

    const chatId = formatPhone(phoneValidation.phone);

    // Generate personalized message
    const message = generateMessage(template, contact);

    const mediaValidation = validateMediaFile(mediaFile);
    const hasValidMedia =
      mediaValidation.valid;
    const mediaRequested =
      Boolean(mediaFile);
    let mediaSendFailed = false;

    try {

      console.log(`Sending to ${rawPhone}...`);

      let mediaSent = false;
      let textSent = false;

      // Try sending media first
      if (hasValidMedia) {

        try {

          if (isImage(mediaValidation.extension)) {

            const normalizedMediaPath =
              path.resolve(mediaFile);

            await client.sendImage(
              chatId,
              normalizedMediaPath,
              path.basename(normalizedMediaPath),
              message
            );

          } else {

            const normalizedMediaPath =
              path.resolve(mediaFile);

            await client.sendFile(
              chatId,
              normalizedMediaPath,
              path.basename(normalizedMediaPath),
              message
            );

          }

          mediaSent = true;

        } catch (mediaError) {

          mediaSendFailed = true;

          console.log(
            `Media failed for ${rawPhone}`
          );

          console.log(
            `Media path: ${mediaFile}`
          );

          console.log(
            `Error: ${mediaError.message}`
          );

        }
      }

      // Send text when no media was selected, or fall back to text if media failed
      if (!mediaSent) {

        await client.sendText(chatId, message);

        textSent = true;
      }

      // Determine final status
      let status = "failed";

      if (mediaSent) {
        status = "success";
      }

      if (
        textSent &&
        !mediaSent &&
        mediaSendFailed
      ) {
        status = "partial_success";
      }

      if (
        textSent &&
        !mediaSent &&
        !mediaSendFailed
      ) {
        status = "success";
      }

      // Count results
      if (mediaSent || textSent) {

        successContacts.push(contact);
        successCount++;

      } else {

        failedCount++;

        failedContacts.push(contact);
      }

      results.push({
        phone: rawPhone,
        status,
        message
      });

      console.log(`${status}: ${rawPhone}`);

    } catch (error) {

      // WPPConnect internal bug
      // Message was actually sent
      if (
        error.message.includes("msgChunks")
      ) {

        const status =
          mediaRequested
            ? "success_with_warning"
            : "success";

        if (mediaRequested) {

          console.log(
            `Warning: Message sent but WPPConnect threw internal error`
          );
        }

        successCount++;

        const result = {
          phone: rawPhone,
          status,
          message
        };

        if (mediaRequested) {

          result.warning =
            error.message;
        }

        results.push(result);

        successContacts.push(contact);

      } else {

        failedCount++;

        failedContacts.push(contact);

        results.push({
          phone: rawPhone,
          status: "failed",
          error: error.message
        });

        console.log(`Failed: ${rawPhone}`);
        console.log(error.message);
      }
    }

    emitCounters();
    emitProgress(i + 1, contacts.length);

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

  // Save failed contacts to Excel
  if (failedContacts.length > 0) {

    const failedWorkbook =
      XLSX.utils.book_new();

    const failedWorksheet =
      XLSX.utils.json_to_sheet(
        failedContacts
      );

    XLSX.utils.book_append_sheet(
      failedWorkbook,
      failedWorksheet,
      "Failed Contacts"
    );

    failedFile = path.join(
      logsDir,
      `failed-${Date.now()}.csv`
    );

    XLSX.writeFile(
      failedWorkbook,
      failedFile,
      {
        bookType: "csv"
      }
    );

    console.log(
      `Failed contacts saved to: ${failedFile}`
    );
  }

  if (successContacts.length > 0) {

    successFile =
      path.join(
        logsDir,
        `success-${Date.now()}.csv`
      );

    const headers =
      Object.keys(successContacts[0])
        .map(key => ({
          id: key,
          title: key
        }));

    const csvWriter =
      createObjectCsvWriter({

        path: successFile,

        header: headers
      });

    await csvWriter.writeRecords(
      successContacts
    );

    console.log(
      `Success contacts saved: ${successFile}`
    );
  }

  // Final summary
  console.log("\n========== SUMMARY ==========");

  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Skipped: ${skippedCount}`);

  console.log("=============================\n");

  console.log("Broadcast finished.");
  console.log(`Log saved to: ${logFile}`);

  return {
    logFile,
    failedFile,
    successFile,
    counters: getCounters()
  };
}

module.exports = {
  sendBroadcast
};
