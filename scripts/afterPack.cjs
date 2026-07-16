const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

module.exports = async function afterPack(context) {

  if (context.electronPlatformName !== "win32") {

    return;
  }

  const {
    rcedit
  } = await import("rcedit");

  const exePath =
    path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.exe`
    );

  const iconPath =
    path.join(
      context.packager.projectDir,
      "build",
      "icon.ico"
    );

  const env =
    dotenv.config({
      path: path.join(
        context.packager.projectDir,
        ".env"
      ),
      quiet: true
    }).parsed || {};

  const publicConfigPath =
    path.join(
      context.appOutDir,
      "resources",
      "app",
      "electron",
      "public-config.json"
    );

  fs.writeFileSync(
    publicConfigPath,
    JSON.stringify(
      {
        helpVideoUrl:
          String(env.HELP_VIDEO_URL || "").trim()
      },
      null,
      2
    )
  );

  await rcedit(
    exePath,
    {
      icon:
        iconPath
    }
  );
};
