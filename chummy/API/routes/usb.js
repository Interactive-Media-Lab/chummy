const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const USB_PATH = "/mnt/usb";
const MUSIC_PATH = "/music/mt";

router.get("/", (req, res) => {
  // You could add checks here to see if the path exists
  res.json({ path: USB_PATH });
});

router.post("/copy", (req, res) => {
  // Check if USB path exists
  if (!fs.existsSync(USB_PATH)) {
    return res.status(404).json({ error: "USB drive not found" });
  }

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(MUSIC_PATH)) {
    fs.mkdirSync(MUSIC_PATH, { recursive: true });
  }

  // Copy files from USB to music directory
  exec(`cp -r "${USB_PATH}"/* "${MUSIC_PATH}"/`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error copying files: ${error}`);
      return res
        .status(500)
        .json({ error: "Failed to copy files", details: error.message });
    }

    if (stderr) {
      console.warn(`Copy warning: ${stderr}`);
    }

    res.json({
      message: "Files copied successfully",
      from: USB_PATH,
      to: MUSIC_PATH,
    });
  });
});

module.exports = router;
