const fs = require("fs");
const path = require("path");

function fileExists(filePath) {

  try {

    return Boolean(filePath) && fs.existsSync(filePath);

  } catch (error) {

    return false;
  }
}

function normalizeCandidate(candidate) {

  if (!candidate || !candidate.executablePath) {

    return null;
  }

  return {
    name: candidate.name,
    executablePath: path.normalize(candidate.executablePath),
    source: candidate.source
  };
}

function getWindowsBrowserCandidates() {

  const programFiles =
    process.env.PROGRAMFILES ||
    "C:\\Program Files";

  const programFilesX86 =
    process.env["PROGRAMFILES(X86)"] ||
    "C:\\Program Files (x86)";

  const localAppData =
    process.env.LOCALAPPDATA;

  const candidates = [
    {
      name: "Microsoft Edge",
      executablePath: path.join(
        programFilesX86,
        "Microsoft",
        "Edge",
        "Application",
        "msedge.exe"
      ),
      source: "system"
    },
    {
      name: "Microsoft Edge",
      executablePath: path.join(
        programFiles,
        "Microsoft",
        "Edge",
        "Application",
        "msedge.exe"
      ),
      source: "system"
    },
    {
      name: "Google Chrome",
      executablePath: path.join(
        programFiles,
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
      source: "system"
    },
    {
      name: "Google Chrome",
      executablePath: path.join(
        programFilesX86,
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
      source: "system"
    }
  ];

  if (localAppData) {

    candidates.push(
      {
        name: "Microsoft Edge",
        executablePath: path.join(
          localAppData,
          "Microsoft",
          "Edge",
          "Application",
          "msedge.exe"
        ),
        source: "user"
      },
      {
        name: "Google Chrome",
        executablePath: path.join(
          localAppData,
          "Google",
          "Chrome",
          "Application",
          "chrome.exe"
        ),
        source: "user"
      }
    );
  }

  return candidates
    .map(normalizeCandidate)
    .filter(Boolean);
}

function getBrowserCandidates() {

  const envBrowserPath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH;

  const candidates = [];

  if (envBrowserPath) {

    candidates.push({
      name: "Configured browser",
      executablePath: envBrowserPath,
      source: "environment"
    });
  }

  if (process.platform === "win32") {

    candidates.push(
      ...getWindowsBrowserCandidates()
    );
  }

  const seen = new Set();

  return candidates
    .map(normalizeCandidate)
    .filter(Boolean)
    .filter((candidate) => {

      const key =
        candidate.executablePath.toLowerCase();

      if (seen.has(key)) {

        return false;
      }

      seen.add(key);

      return true;
    });
}

function findBrowserExecutable() {

  return getBrowserCandidates()
    .find((candidate) => fileExists(
      candidate.executablePath
    )) || null;
}

function createBrowserLaunchConfig() {

  const browser =
    findBrowserExecutable();

  if (!browser) {

    return {
      browser: null,
      options: {}
    };
  }

  return {
    browser,
    options: {
      useChrome: false,
      puppeteerOptions: {
        executablePath: browser.executablePath
      }
    }
  };
}

function getMissingBrowserMessage() {

  return [
    "Could not find Microsoft Edge or Google Chrome on this computer.",
    "The app needs a Chromium-based browser to connect to WhatsApp.",
    "Please contact IT support to install or repair Microsoft Edge or Google Chrome."
  ].join(" ");
}

module.exports = {
  createBrowserLaunchConfig,
  findBrowserExecutable,
  getBrowserCandidates,
  getMissingBrowserMessage
};
