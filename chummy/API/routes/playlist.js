const express = require("express");
const router = express.Router();

const playlistsDir = "/media/farbod/128 GB";
// GET /playlist/all - Get all playlists
router.get("/all", (req, res) => {
  try {

    // Check if directory exists
    if (!fs.existsSync(playlistsDir)) {
      return res.status(404).json({ error: "Playlists directory not found" });
    }

    // Read directory contents
    const items = fs.readdirSync(playlistsDir);

    const playlists = {};

    // Filter for MP3 files in root directory
    const mp3Files = items.filter((item) => {
      const itemPath = path.join(playlistsDir, item);
      const stats = fs.statSync(itemPath);
      return stats.isFile() && path.extname(item).toLowerCase() === ".mp3";
    });

    // Add root MP3 files as "All Songs" if any exist
    if (mp3Files.length > 0) {
      playlists["All Songs"] = mp3Files;
    }

    // Look for folders that might contain playlists
    const folders = items.filter((item) => {
      const itemPath = path.join(playlistsDir, item);
      const stats = fs.statSync(itemPath);
      return stats.isDirectory();
    });

    // Process each folder as a potential playlist
    for (const folder of folders) {
      const folderPath = path.join(playlistsDir, folder);
      try {
        const folderContents = fs.readdirSync(folderPath);
        const folderMp3Files = folderContents.filter((file) => {
          const filePath = path.join(folderPath, file);
          const stats = fs.statSync(filePath);
          return stats.isFile() && path.extname(file).toLowerCase() === ".mp3";
        });

        // Only add folder as playlist if it contains MP3 files
        if (folderMp3Files.length > 0) {
          playlists[folder] = folderMp3Files;
        }
      } catch (err) {
        console.error(`Error reading folder ${folder}:`, err);
      }
    }

    res.json(playlists);
  } catch (error) {
    console.error("Error reading playlists:", error);
    res.status(500).json({ error: "Failed to read playlists" });
  }
});

module.exports = router;
