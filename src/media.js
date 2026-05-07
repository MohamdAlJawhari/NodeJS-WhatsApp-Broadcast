const fs = require("fs");
const path = require("path");

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
  ".mp4"
];

function validateMediaFile(filePath) {
  if (!filePath) {
    return {
      valid: false,
      reason: "No media file provided"
    };
  }

  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      reason: "Media file does not exist"
    };
  }

  const extension = path.extname(filePath).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      reason: `Unsupported file type: ${extension}`
    };
  }

  return {
    valid: true,
    extension
  };
}

function isImage(extension) {
  return [".jpg", ".jpeg", ".png"].includes(extension);
}

module.exports = {
  validateMediaFile,
  isImage
};