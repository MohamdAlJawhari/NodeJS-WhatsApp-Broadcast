const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { generateMessage } = require("./template");
const { sleep, randomDelay, formatPhone } = require("./utils");
const { validateMediaFile } = require("./media");
const { validatePhone } = require("./validator");
const { getPhoneValue } = require("./phoneColumn");
const broadcastController = require("./broadcastController");
const defaultMessagingService =
  require("./services/whatsappService");
const { createObjectCsvWriter } = require("csv-writer");
const {
  createContactLogEntry,
  createLogRunId,
  formatLiveLogRecipient,
  formatLogPhone,
  getMediaType,
  logRecipientDiagnostics,
  sanitizeLogText
} = require("./broadcast/logging");

async function sendBroadcast(client, contacts, options) {
  const {
    template,
    mediaFile,
    delayMin,
    delayMax,
    batchSize,
    batchPause,
    mediaRetryAttempts = 3,
    mediaRetryDelay = 15000,
    onProgress,
    onCountersUpdate,
    logger = console,
    redactLiveRecipients = true,
    logsDir:
      customLogsDir,
    messagingService =
      defaultMessagingService,
    recipientResolver =
      resolveWhatsAppRecipient
  } = options;

  const log =
    createLogFunction(logger);

  const formatLiveRecipient =
    redactLiveRecipients
      ? formatLogPhone
      : formatLiveLogRecipient;

  // Ensure logs directory exists
  const logsDir =
    customLogsDir ||
    path.join(__dirname, "..", "logs");

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, {
      recursive: true
    });
  }

  const mediaRequested =
    Boolean(mediaFile);

  const selectedMediaValidation =
    mediaRequested
      ? validateMediaFile(mediaFile)
      : null;

  if (
    mediaRequested &&
    !selectedMediaValidation.valid
  ) {

    throw new Error(
      `Selected media cannot be sent: ${selectedMediaValidation.reason}. Remove the media or choose a supported file before starting.`
    );
  }

  const runId =
    createLogRunId();

  const logFile = path.join(
    logsDir,
    `send-log-${runId}.json`
  );

  let failedFile = null;
  let failedRetryFile = null;
  let successFile = null;

  const results = [];
  const failedLogRows = [];
  const failedRetryContacts = [];
  const successLogRows = [];

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

  log(
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
      log(
        "Broadcast stopped"
      );

      break;
    }

    while (broadcastController.paused) {

      log(
        "Broadcast paused. Waiting to resume..."
      );
      await sleep(1000);
    }

    if (broadcastController.stopped) {
      log(
        "Broadcast stopped"
      );

      break;
    }

    const contact = contacts[i];

    const recipient =
      await recipientResolver(contact, {
        client,
        contact,
        index: i,
        messagingService
      });

    const rawPhone =
      recipient.rawRecipient;

    const logPhone =
      formatLiveRecipient(rawPhone);


    const progress = (
      ((i + 1) / contacts.length) * 100
    ).toFixed(1);

    log(
      `\n[${progress}%] Processing ${i + 1}/${contacts.length}`
    );

    logRecipientDiagnostics(
      recipient,
      log,
      {
        redactRecipientValues:
          redactLiveRecipients
      }
    );

    if (!recipient.valid) {

      const reason =
        sanitizeLogText(recipient.reason);

      log(`Skipped: ${logPhone}`);
      log(reason);

      skippedCount++;

      const logEntry =
        createContactLogEntry({
          contact,
          index: i,
          recipient,
          rawPhone,
          status: "skipped",
          reason
        });

      results.push({
        ...logEntry,
        status: "skipped",
        reason
      });

      failedLogRows.push(logEntry);

      failedRetryContacts.push(contact);

      emitCounters();
      emitProgress(i + 1, contacts.length);

      fs.writeFileSync(
        logFile,
        JSON.stringify(results, null, 2)
      );

      continue;
    }

    const chatId = recipient.chatId;

    // Generate personalized message
    const message = generateMessage(template, contact);

    const mediaValidation =
      selectedMediaValidation ||
      validateMediaFile(mediaFile);

    const hasValidMedia =
      mediaValidation.valid;

    let mediaSendFailed = false;
    let mediaErrorMessage = null;

    try {

      log(`Sending to ${logPhone}...`);

      let mediaSent = false;
      let textSent = false;

      if (
        mediaRequested &&
        !hasValidMedia
      ) {

        mediaSendFailed = true;
        mediaErrorMessage =
          mediaValidation.reason;

        log(
          `Media invalid for ${logPhone}`
        );

        log(
          `Media type: ${getMediaType(mediaFile)}`
        );

        log(
          `Error: ${sanitizeLogText(mediaErrorMessage)}`
        );
      }

      // Try sending media first. If media is selected, do not fall back to text-only.
      if (hasValidMedia) {

        const maxAttempts =
          Math.max(
            1,
            Number(mediaRetryAttempts) || 1
          );

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {

          try {

            await messagingService.sendMedia(
              client,
              chatId,
              mediaFile,
              mediaValidation,
              message
            );

            mediaSent = true;
            mediaSendFailed = false;
            mediaErrorMessage = null;

            break;

          } catch (mediaError) {

            mediaSendFailed = true;
            mediaErrorMessage =
              mediaError.message;

            log(
              `Media failed for ${logPhone} (attempt ${attempt}/${maxAttempts})`
            );

            log(
              `Media type: ${getMediaType(mediaFile)}`
            );

            log(
              `Error: ${sanitizeLogText(mediaErrorMessage)}`
            );

            if (attempt < maxAttempts) {

              log(
                `Retrying media in ${mediaRetryDelay / 1000}s...`
              );

              await sleep(mediaRetryDelay);
            }
          }

        }
      }

      // Send text only when no media was selected.
      if (
        !mediaRequested &&
        !mediaSent
      ) {

        await messagingService.sendText(
          client,
          chatId,
          message
        );

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
        !mediaSendFailed
      ) {
        status = "success";
      }

      // Count results
      if (mediaSent || textSent) {

        successCount++;

      } else {

        failedCount++;

        failedRetryContacts.push(contact);
      }

      const logEntry =
        createContactLogEntry({
          contact,
          index: i,
          recipient,
          rawPhone,
          status,
          error:
            mediaSendFailed
              ? mediaErrorMessage
              : undefined,
          mediaSelected:
            mediaRequested,
          mediaType:
            getMediaType(mediaFile)
        });

      results.push(logEntry);

      if (mediaSent || textSent) {

        successLogRows.push(logEntry);

      } else {

        failedLogRows.push(logEntry);
      }

      log(`${status}: ${logPhone}`);

    } catch (error) {

      const errorMessage =
        sanitizeLogText(error.message);

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

          log(
            `Warning: Message sent but WPPConnect threw internal error`
          );
        }

        successCount++;

        const result =
          createContactLogEntry({
            contact,
            index: i,
            recipient,
            rawPhone,
            status,
            warning:
              mediaRequested
                ? errorMessage
                : undefined,
            mediaSelected:
              mediaRequested,
            mediaType:
              getMediaType(mediaFile)
          });

        results.push(result);

        successLogRows.push(result);

      } else {

        failedCount++;

        failedRetryContacts.push(contact);

        const result =
          createContactLogEntry({
            contact,
            index: i,
            recipient,
            rawPhone,
            status: "failed",
            error:
              errorMessage,
            mediaSelected:
              mediaRequested,
            mediaType:
              getMediaType(mediaFile)
          });

        results.push(result);

        failedLogRows.push(result);

        log(`Failed: ${logPhone}`);
        log(errorMessage);
      }
    }

    emitCounters();
    emitProgress(i + 1, contacts.length);

    // Save sanitized logs continuously
    fs.writeFileSync(
      logFile,
      JSON.stringify(results, null, 2)
    );

    // Delay between messages
    const delay = randomDelay(delayMin, delayMax);

    log(`Waiting ${delay / 1000}s...`);

    await sleep(delay);

    // Pause after batch
    if (
      (i + 1) % batchSize === 0 &&
      i + 1 < contacts.length
    ) {

      log(
        `Batch finished. Pausing ${batchPause / 1000}s...`
      );

      await sleep(batchPause);
    }
  }

  if (failedLogRows.length > 0) {

    failedFile = path.join(
      logsDir,
      `failed-${runId}.csv`
    );

    await writeSanitizedCsvLog(
      failedFile,
      failedLogRows
    );

    log(
      `Failed summary saved: ${path.basename(failedFile)}`
    );
  }

  // Retry needs the original contact fields to regenerate personalized messages.
  if (failedRetryContacts.length > 0) {

    const failedRetryWorkbook =
      XLSX.utils.book_new();

    const failedRetryWorksheet =
      XLSX.utils.json_to_sheet(
        failedRetryContacts
      );

    XLSX.utils.book_append_sheet(
      failedRetryWorkbook,
      failedRetryWorksheet,
      "Retry Failed Contacts"
    );

    failedRetryFile = path.join(
      logsDir,
      `retry-failed-${runId}.csv`
    );

    XLSX.writeFile(
      failedRetryWorkbook,
      failedRetryFile,
      {
        bookType: "csv"
      }
    );

    log(
      `Retry contacts saved: ${path.basename(failedRetryFile)}`
    );
  }

  if (successLogRows.length > 0) {

    successFile =
      path.join(
        logsDir,
        `success-${runId}.csv`
      );

    await writeSanitizedCsvLog(
      successFile,
      successLogRows
    );

    log(
      `Success summary saved: ${path.basename(successFile)}`
    );
  }

  // Final summary
  log("\n========== SUMMARY ==========");

  log(`Success: ${successCount}`);
  log(`Failed: ${failedCount}`);
  log(`Skipped: ${skippedCount}`);

  log("=============================\n");

  log("Broadcast finished.");
  log(`Log saved: ${path.basename(logFile)}`);

  return {
    logFile,
    failedFile,
    failedRetryFile,
    successFile,
    counters: getCounters()
  };
}

function resolveWhatsAppRecipient(contact) {

  const rawPhone =
    getPhoneValue(contact);

  const phoneValidation =
    validatePhone(rawPhone);

  if (!phoneValidation.valid) {

    return {
      valid: false,
      rawRecipient:
        rawPhone,
      reason:
        phoneValidation.reason
    };
  }

  return {
    valid: true,
    rawRecipient:
      rawPhone,
    chatId:
      formatPhone(phoneValidation.phone)
  };
}

async function writeSanitizedCsvLog(
  filePath,
  rows
) {

  const csvWriter =
    createObjectCsvWriter({
      path: filePath,
      header: [
        {
          id: "timestamp",
          title: "timestamp"
        },
        {
          id: "rowNumber",
          title: "rowNumber"
        },
        {
          id: "contactId",
          title: "contactId"
        },
        {
          id: "phone",
          title: "phone"
        },
        {
          id: "recipientSource",
          title: "recipientSource"
        },
        {
          id: "recipientDetails",
          title: "recipientDetails"
        },
        {
          id: "status",
          title: "status"
        },
        {
          id: "reason",
          title: "reason"
        },
        {
          id: "error",
          title: "error"
        },
        {
          id: "warning",
          title: "warning"
        },
        {
          id: "mediaSelected",
          title: "mediaSelected"
        },
        {
          id: "mediaType",
          title: "mediaType"
        }
      ]
    });

  await csvWriter.writeRecords(rows);
}

function createLogFunction(logger) {

  if (typeof logger === "function") {

    return logger;
  }

  if (
    logger &&
    typeof logger.log === "function"
  ) {

    return logger.log.bind(logger);
  }

  return console.log.bind(console);
}

module.exports = {
  sendBroadcast
};
