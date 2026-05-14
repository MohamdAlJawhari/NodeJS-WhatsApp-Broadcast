const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const XLSX = require("xlsx");

const {
  loadContacts
} = require("../src/contacts");

function createContactFileService({
  app,
  dialog,
  shell
}) {

  const appRootDir = path.join(
    __dirname,
    ".."
  );

  function getWritableRootDir() {

    if (app.isPackaged) {

      return app.getPath("userData");
    }

    return appRootDir;
  }

  function ensureDirectory(dirPath) {

    if (!fs.existsSync(dirPath)) {

      fs.mkdirSync(dirPath, {
        recursive: true
      });
    }

    return dirPath;
  }

  function getSavedContactsDir() {

    return path.join(
      getWritableRootDir(),
      "data",
      "saved-contacts"
    );
  }

  function ensureSavedContactsDir() {

    return ensureDirectory(
      getSavedContactsDir()
    );
  }

  function sanitizeFileName(name) {

    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "contacts";
  }

  function createTimestamp() {

    return new Date()
      .toISOString()
      .replace(/[:.]/g, "-");
  }

  function hashFile(filePath) {

    const hash =
      crypto.createHash("sha256");

    hash.update(
      fs.readFileSync(filePath)
    );

    return hash.digest("hex");
  }

  function isContactFile(fileName) {

    return [
      ".xlsx",
      ".xls",
      ".csv"
    ].includes(
      path.extname(fileName).toLowerCase()
    );
  }

  function getSavedContactEntries() {

    const savedContactsDir =
      ensureSavedContactsDir();

    const groups = new Map();

    fs.readdirSync(savedContactsDir)
      .filter(isContactFile)
      .forEach(fileName => {

        const filePath =
          path.join(savedContactsDir, fileName);

        const stats =
          fs.statSync(filePath);

        const fileHash =
          hashFile(filePath);

        if (!groups.has(fileHash)) {

          groups.set(fileHash, []);
        }

        groups.get(fileHash).push({
          id: fileName,
          fileName,
          filePath,
          displayName:
            fileName.replace(
              /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/,
              ""
            ),
          size: stats.size,
          modifiedAtMs:
            stats.mtimeMs,
          modifiedAt:
            stats.mtime.toISOString()
        });
      });

    return [...groups.values()]
      .map(entries => {

        const newest =
          entries.sort((a, b) => {
            return b.modifiedAtMs - a.modifiedAtMs;
          })[0];

        let count = null;
        let loadError = null;

        try {

          count =
            loadContacts(newest.filePath).length;

        } catch (error) {

          loadError =
            error.message;
        }

        return {
          ...newest,
          count,
          loadError,
          duplicateCount:
            entries.length
        };
      })
      .sort((a, b) => {
        return new Date(b.modifiedAt) -
          new Date(a.modifiedAt);
      });
  }

  function resolveSavedContactPath(id) {

    const savedContactsDir =
      ensureSavedContactsDir();

    const requestedPath =
      path.resolve(savedContactsDir, id);

    const savedRoot =
      path.resolve(savedContactsDir);

    const relativePath =
      path.relative(savedRoot, requestedPath);

    if (
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath)
    ) {

      throw new Error("Invalid saved contacts file");
    }

    if (!fs.existsSync(requestedPath)) {

      throw new Error("Saved contacts file was not found");
    }

    if (!isContactFile(requestedPath)) {

      throw new Error("Saved file is not a contacts file");
    }

    return requestedPath;
  }

  function archiveContactFile(filePath) {

    const savedContactsDir =
      ensureSavedContactsDir();

    const sourceHash =
      hashFile(filePath);

    const duplicate =
      fs.readdirSync(savedContactsDir)
        .filter(isContactFile)
        .find(fileName => {

          const savedFilePath =
            path.join(savedContactsDir, fileName);

          return hashFile(savedFilePath) ===
            sourceHash;
        });

    if (duplicate) {

      return {
        filePath:
          path.join(savedContactsDir, duplicate),
        duplicate: true
      };
    }

    const parsed =
      path.parse(filePath);

    const fileName = [
      createTimestamp(),
      sanitizeFileName(parsed.name)
    ].join("_") + parsed.ext.toLowerCase();

    const savedFilePath =
      path.join(savedContactsDir, fileName);

    fs.copyFileSync(
      filePath,
      savedFilePath
    );

    return {
      filePath: savedFilePath,
      duplicate: false
    };
  }

  function getContactMetaPath(filePath) {

    return `${filePath}.meta.json`;
  }

  function readContactMeta(filePath) {

    const metaPath =
      getContactMetaPath(filePath);

    if (!fs.existsSync(metaPath)) {

      return {
        description: ""
      };
    }

    try {

      return JSON.parse(
        fs.readFileSync(metaPath, "utf8")
      );

    } catch {

      return {
        description: ""
      };
    }
  }

  function writeContactMeta(filePath, meta) {

    fs.writeFileSync(
      getContactMetaPath(filePath),
      JSON.stringify(meta, null, 2)
    );
  }

  function getContactFileStats(filePath) {

    const stats =
      fs.statSync(filePath);

    return {
      id: path.basename(filePath),
      fileName: path.basename(filePath),
      filePath,
      size: stats.size,
      modifiedAt:
        stats.mtime.toISOString()
    };
  }

  function readContactFileRows(filePath) {

    const workbook =
      XLSX.readFile(filePath);

    const sheetName =
      workbook.SheetNames[0];

    const sheet =
      workbook.Sheets[sheetName];

    const rows =
      XLSX.utils.sheet_to_json(
        sheet,
        {
          header: 1,
          defval: "",
          raw: false
        }
      );

    if (rows.length === 0) {

      return [[
        process.env.PHONE_COLUMN ||
        "phone"
      ]];
    }

    return rows.map(row => {
      return row.map(cell => {
        return String(cell ?? "");
      });
    });
  }

  function normalizeContactRows(rows) {

    const normalized =
      Array.isArray(rows)
        ? rows.map(row => {
          return Array.isArray(row)
            ? row.map(cell => String(cell ?? ""))
            : [];
        })
        : [];

    if (normalized.length === 0) {

      normalized.push([
        process.env.PHONE_COLUMN ||
        "phone"
      ]);
    }

    const width =
      Math.max(
        1,
        ...normalized.map(row => row.length)
      );

    return normalized.map(row => {

      const nextRow =
        [...row];

      while (nextRow.length < width) {

        nextRow.push("");
      }

      return nextRow;
    });
  }

  function validateContactRows(rows) {

    const phoneColumn =
      process.env.PHONE_COLUMN || "phone";

    const headers =
      rows[0].map(header => {
        return String(header).trim();
      });

    const hasPhoneColumn =
      headers.some(header => {
        return header.toLowerCase() ===
          phoneColumn.toLowerCase();
      });

    if (!hasPhoneColumn) {

      throw new Error(
        `The '${phoneColumn}' column is required and cannot be removed or renamed.`
      );
    }

    const usedHeaders =
      new Set();

    headers.forEach((header, index) => {

      if (!header) {

        throw new Error(
          `Column ${index + 1} needs a name.`
        );
      }

      const normalizedHeader =
        header.toLowerCase();

      if (usedHeaders.has(normalizedHeader)) {

        throw new Error(
          `Duplicate column name: ${header}`
        );
      }

      usedHeaders.add(normalizedHeader);
    });
  }

  function writeContactFileRows(filePath, rows) {

    const normalizedRows =
      normalizeContactRows(rows);

    validateContactRows(normalizedRows);

    const workbook =
      XLSX.utils.book_new();

    const worksheet =
      XLSX.utils.aoa_to_sheet(normalizedRows);

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Contacts"
    );

    const extension =
      path.extname(filePath).toLowerCase();

    const bookType =
      extension === ".csv"
        ? "csv"
        : extension === ".xls"
          ? "xls"
          : "xlsx";

    XLSX.writeFile(
      workbook,
      filePath,
      {
        bookType
      }
    );
  }

  function getSavedContactDetails(id) {

    const filePath =
      resolveSavedContactPath(id);

    const rows =
      normalizeContactRows(
        readContactFileRows(filePath)
      );

    const phoneColumn =
      process.env.PHONE_COLUMN || "phone";

    const phoneColumnIndex =
      rows[0].findIndex(header => {
        return String(header).trim().toLowerCase() ===
          phoneColumn.toLowerCase();
      });

    return {
      ...getContactFileStats(filePath),
      description:
        readContactMeta(filePath).description || "",
      rows,
      rowCount:
        Math.max(0, rows.length - 1),
      columnCount:
        rows[0].length,
      phoneColumn,
      phoneColumnIndex
    };
  }

  function updateSavedContactDetails(data) {

    const filePath =
      resolveSavedContactPath(data.id);

    const currentExtension =
      path.extname(filePath).toLowerCase();

    const requestedName =
      String(data.fileName || path.basename(filePath))
        .trim();

    const requestedExtension =
      path.extname(requestedName).toLowerCase();

    if (
      requestedExtension &&
      requestedExtension !== currentExtension
    ) {

      throw new Error(
        `Keep the file extension as '${currentExtension}'.`
      );
    }

    const baseName =
      sanitizeFileName(
        path.basename(
          requestedName,
          requestedExtension || currentExtension
        )
      );

    const newFileName =
      `${baseName}${currentExtension}`;

    const savedContactsDir =
      ensureSavedContactsDir();

    const newFilePath =
      path.join(savedContactsDir, newFileName);

    let finalFilePath =
      filePath;

    if (newFilePath !== filePath) {

      if (fs.existsSync(newFilePath)) {

        throw new Error(
          "A saved contacts file with this name already exists."
        );
      }

      const oldMetaPath =
        getContactMetaPath(filePath);

      fs.renameSync(filePath, newFilePath);

      if (fs.existsSync(oldMetaPath)) {

        fs.renameSync(
          oldMetaPath,
          getContactMetaPath(newFilePath)
        );
      }

      finalFilePath =
        newFilePath;
    }

    writeContactMeta(
      finalFilePath,
      {
        description:
          String(data.description || "")
      }
    );

    return getSavedContactDetails(
      path.basename(finalFilePath)
    );
  }

  function updateSavedContactContent(data) {

    const filePath =
      resolveSavedContactPath(data.id);

    writeContactFileRows(
      filePath,
      data.rows
    );

    return getSavedContactDetails(data.id);
  }

  function deleteSavedContactFile(id) {

    const filePath =
      resolveSavedContactPath(id);

    const metaPath =
      getContactMetaPath(filePath);

    fs.unlinkSync(filePath);

    if (fs.existsSync(metaPath)) {

      fs.unlinkSync(metaPath);
    }
  }

  async function exportSavedContactFile(id) {

    const filePath =
      resolveSavedContactPath(id);

    const result =
      await dialog.showSaveDialog({
        defaultPath:
          path.basename(filePath),
        filters: [
          {
            name: "Contact Files",
            extensions: [
              "xlsx",
              "xls",
              "csv"
            ]
          }
        ]
      });

    if (result.canceled) {

      return {
        success: false
      };
    }

    fs.copyFileSync(
      filePath,
      result.filePath
    );

    return {
      success: true,
      filePath:
        result.filePath
    };
  }

  function registerHandlers(ipcMain) {

    ipcMain.handle(
      "list-saved-contact-files",
      async () => {

        try {

          return {
            success: true,
            files:
              getSavedContactEntries()
          };

        } catch (error) {

          return {
            success: false,
            error: error.message,
            files: []
          };
        }
      }
    );

    ipcMain.handle(
      "load-saved-contact-file",
      async (_, id) => {

        try {

          const filePath =
            resolveSavedContactPath(id);

          const contacts =
            loadContacts(filePath);

          return {
            success: true,
            filePath,
            count: contacts.length,
            contacts
          };

        } catch (error) {

          return {
            success: false,
            error: error.message
          };
        }
      }
    );

    ipcMain.handle(
      "open-saved-contacts-folder",
      async () => {

        try {

          const folderPath =
            ensureSavedContactsDir();

          const error =
            await shell.openPath(folderPath);

          if (error) {

            return {
              success: false,
              error
            };
          }

          return {
            success: true,
            folderPath
          };

        } catch (error) {

          return {
            success: false,
            error: error.message
          };
        }
      }
    );

    ipcMain.handle(
      "get-saved-contact-details",
      async (_, id) => {

        try {

          return {
            success: true,
            file:
              getSavedContactDetails(id)
          };

        } catch (error) {

          return {
            success: false,
            error: error.message
          };
        }
      }
    );

    ipcMain.handle(
      "save-saved-contact-details",
      async (_, data) => {

        try {

          return {
            success: true,
            file:
              updateSavedContactDetails(data)
          };

        } catch (error) {

          return {
            success: false,
            error: error.message
          };
        }
      }
    );

    ipcMain.handle(
      "save-saved-contact-content",
      async (_, data) => {

        try {

          return {
            success: true,
            file:
              updateSavedContactContent(data)
          };

        } catch (error) {

          return {
            success: false,
            error: error.message
          };
        }
      }
    );

    ipcMain.handle(
      "delete-saved-contact-file",
      async (_, id) => {

        try {

          deleteSavedContactFile(id);

          return {
            success: true
          };

        } catch (error) {

          return {
            success: false,
            error: error.message
          };
        }
      }
    );

    ipcMain.handle(
      "export-saved-contact-file",
      async (_, id) => {

        try {

          return await exportSavedContactFile(id);

        } catch (error) {

          return {
            success: false,
            error: error.message
          };
        }
      }
    );
  }

  return {
    archiveContactFile,
    ensureSavedContactsDir,
    getSavedContactEntries,
    getSavedContactDetails,
    registerHandlers,
    resolveSavedContactPath,
    updateSavedContactContent,
    updateSavedContactDetails
  };
}

module.exports = {
  createContactFileService
};
