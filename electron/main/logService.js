const fs = require("fs");
const path = require("path");

function createLogService({
  runtimePaths,
  shell
}) {

  function getLogType(kind) {

    const logTypes = {
      success: {
        prefix: "success",
        extension: ".csv"
      },
      failed: {
        prefix: "failed",
        extension: ".csv"
      },
      failedRetry: {
        prefix: "retry-failed",
        extension: ".csv"
      },
      send: {
        prefix: "send-log",
        extension: ".json"
      }
    };

    return logTypes[kind] || null;
  }

  function findLatestLogFile(kind) {

    const logType =
      getLogType(kind);

    if (!logType) {

      return null;
    }

    const logsDir =
      runtimePaths.ensureLogsDir();

    const files = fs.readdirSync(logsDir)
      .filter(file => {
        return file.startsWith(`${logType.prefix}-`) &&
          file.endsWith(logType.extension);
      })
      .map(file => {
        const filePath =
          path.join(logsDir, file);

        return {
          filePath,
          modifiedAt:
            fs.statSync(filePath).mtimeMs
        };
      })
      .sort((a, b) => {
        return b.modifiedAt - a.modifiedAt;
      });

    return files[0]?.filePath || null;
  }

  async function openLogLocation(kind) {

    const logType =
      getLogType(kind);

    if (!logType) {

      return {
        success: false,
        error: "Unknown log type"
      };
    }

    const logFile =
      findLatestLogFile(kind);

    if (logFile) {

      shell.showItemInFolder(logFile);

      return {
        success: true,
        filePath: logFile
      };
    }

    const logsDir =
      runtimePaths.ensureLogsDir();

    const error =
      await shell.openPath(logsDir);

    if (error) {

      return {
        success: false,
        error
      };
    }

    return {
      success: true,
      folderPath: logsDir
    };
  }

  function deleteLogFiles(kind) {

    const logType =
      getLogType(kind);

    if (!logType) {

      return {
        success: false,
        error: "Unknown log type"
      };
    }

    const logsDir =
      runtimePaths.ensureLogsDir();

    const files = fs.readdirSync(logsDir)
      .filter(file => {
        return file.startsWith(`${logType.prefix}-`) &&
          file.endsWith(logType.extension);
      });

    const errors = [];

    files.forEach(file => {

      const filePath =
        path.join(logsDir, file);

      try {

        fs.unlinkSync(filePath);

      } catch (error) {

        errors.push(
          `${file}: ${error.message}`
        );
      }
    });

    if (errors.length > 0) {

      return {
        success: false,
        deletedCount:
          files.length - errors.length,
        error:
          `Some logs could not be deleted: ${errors.join("; ")}`
      };
    }

    return {
      success: true,
      deletedCount:
        files.length
    };
  }

  return {
    deleteLogFiles,
    findLatestLogFile,
    getLogType,
    openLogLocation
  };
}

module.exports = {
  createLogService
};
