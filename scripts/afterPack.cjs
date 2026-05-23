const path = require("path");

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

  await rcedit(
    exePath,
    {
      icon:
        iconPath
    }
  );
};
