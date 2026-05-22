const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { generateMessage } = require("./template");
const { sleep, randomDelay, formatPhone } = require("./utils");
const { validateMediaFile, isImage } = require("./media");
const { validatePhone } = require("./validator");
const { getPhoneValue } = require("./phoneColumn");
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
    mediaRetryAttempts = 3,
    mediaRetryDelay = 15000,
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

    const rawPhone =
      getPhoneValue(contact);

    const logPhone =
      formatLogPhone(rawPhone);


    const progress = (
      ((i + 1) / contacts.length) * 100
    ).toFixed(1);

    console.log(
      `\n[${progress}%] Processing ${i + 1}/${contacts.length}`
    );

    // Validate phone number
    const phoneValidation = validatePhone(rawPhone);

    if (!phoneValidation.valid) {

      const reason =
        sanitizeLogText(phoneValidation.reason);

      console.log(`Skipped: ${logPhone}`);
      console.log(reason);

      skippedCount++;

      const logEntry =
        createContactLogEntry({
          contact,
          index: i,
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

    const chatId = formatPhone(phoneValidation.phone);

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

      console.log(`Sending to ${logPhone}...`);

      let mediaSent = false;
      let textSent = false;

      if (
        mediaRequested &&
        !hasValidMedia
      ) {

        mediaSendFailed = true;
        mediaErrorMessage =
          mediaValidation.reason;

        console.log(
          `Media invalid for ${logPhone}`
        );

        console.log(
          `Media type: ${getMediaType(mediaFile)}`
        );

        console.log(
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

            await sendMediaMessage(
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

            console.log(
              `Media failed for ${logPhone} (attempt ${attempt}/${maxAttempts})`
            );

            console.log(
              `Media type: ${getMediaType(mediaFile)}`
            );

            console.log(
              `Error: ${sanitizeLogText(mediaErrorMessage)}`
            );

            if (attempt < maxAttempts) {

              console.log(
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

      console.log(`${status}: ${logPhone}`);

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

          console.log(
            `Warning: Message sent but WPPConnect threw internal error`
          );
        }

        successCount++;

        const result =
          createContactLogEntry({
            contact,
            index: i,
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

        console.log(`Failed: ${logPhone}`);
        console.log(errorMessage);
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

  if (failedLogRows.length > 0) {

    failedFile = path.join(
      logsDir,
      `failed-${runId}.csv`
    );

    await writeSanitizedCsvLog(
      failedFile,
      failedLogRows
    );

    console.log(
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

    console.log(
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

    console.log(
      `Success summary saved: ${path.basename(successFile)}`
    );
  }

  // Final summary
  console.log("\n========== SUMMARY ==========");

  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Skipped: ${skippedCount}`);

  console.log("=============================\n");

  console.log("Broadcast finished.");
  console.log(`Log saved: ${path.basename(logFile)}`);

  return {
    logFile,
    failedFile,
    failedRetryFile,
    successFile,
    counters: getCounters()
  };
}

async function sendMediaMessage(
  client,
  chatId,
  mediaFile,
  mediaValidation,
  message
) {

  const normalizedMediaPath =
    path.resolve(mediaFile);

  if (isImage(mediaValidation.extension)) {

    await client.sendImage(
      chatId,
      normalizedMediaPath,
      path.basename(normalizedMediaPath),
      message
    );

    return;
  }

  await client.sendFile(
    chatId,
    normalizedMediaPath,
    path.basename(normalizedMediaPath),
    message
  );
}

function createContactLogEntry({
  contact,
  index,
  rawPhone,
  status,
  reason,
  error,
  warning,
  mediaSelected = false,
  mediaType = ""
}) {

  return {
    timestamp:
      new Date().toISOString(),
    rowNumber:
      index + 2,
    contactId:
      getContactId(contact),
    phone:
      formatLogPhone(rawPhone),
    status,
    reason:
      sanitizeLogText(reason),
    error:
      sanitizeLogText(error),
    warning:
      sanitizeLogText(warning),
    mediaSelected:
      Boolean(mediaSelected),
    mediaType:
      mediaSelected
        ? mediaType
        : ""
  };
}

function getContactId(contact = {}) {

  const keys = [
    "id",
    "ID",
    "contactId",
    "contact_id",
    "Contact ID"
  ];

  const key =
    keys.find(candidate => {
      return Object.prototype.hasOwnProperty.call(
        contact,
        candidate
      );
    });

  if (!key) {

    return "";
  }

  return String(contact[key] ?? "")
    .trim();
}

function sanitizeLogText(value) {

  if (!value) {

    return "";
  }

  return String(value);
}

function formatLogPhone(phone) {

  return String(phone ?? "");
}

function getMediaType(mediaFile) {

  if (!mediaFile) {

    return "";
  }

  return path.extname(mediaFile)
    .toLowerCase() || "unknown";
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

function createLogRunId() {

  const now =
    new Date();

  const pad = value => {
    return String(value).padStart(2, "0");
  };

  const date =
    [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate())
    ].join("-");

  const time =
    [
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds())
    ].join("-");

  return `${date}_${time}`;
}

module.exports = {
  sendBroadcast
};
