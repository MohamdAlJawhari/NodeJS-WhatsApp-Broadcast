const fs = require("fs");
const path = require("path");

function createRuntimePaths({
  app,
  appRootDir
}) {

  function getWritableRootDir() {

    if (app.isPackaged) {

      return app.getPath("userData");
    }

    return appRootDir;
  }

  function getLogsDir() {

    return path.join(
      getWritableRootDir(),
      "logs"
    );
  }

  function getDataDir() {

    return path.join(
      getWritableRootDir(),
      "data"
    );
  }

  function getSavedContactsDir() {

    return path.join(
      getDataDir(),
      "saved-contacts"
    );
  }

  function getTokensDir() {

    return path.join(
      getWritableRootDir(),
      "tokens"
    );
  }

  function getWritableSettingsPath() {

    return path.join(
      getWritableRootDir(),
      "settings.json"
    );
  }

  function ensureDirectory(dirPath) {

    if (!fs.existsSync(dirPath)) {

      fs.mkdirSync(dirPath, {
        recursive: true
      });
    }

    return dirPath;
  }

  function ensureLogsDir() {

    return ensureDirectory(
      getLogsDir()
    );
  }

  function ensureRuntimePaths() {

    ensureDirectory(
      getWritableRootDir()
    );

    ensureDirectory(
      getDataDir()
    );

    ensureDirectory(
      getSavedContactsDir()
    );

    ensureLogsDir();

    ensureDirectory(
      getTokensDir()
    );
  }

  return {
    ensureDirectory,
    ensureLogsDir,
    ensureRuntimePaths,
    getDataDir,
    getLogsDir,
    getSavedContactsDir,
    getTokensDir,
    getWritableRootDir,
    getWritableSettingsPath
  };
}

module.exports = {
  createRuntimePaths
};
