const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const healthRoutes = require("./routes/health");

// Use routes
app.use("/api/health", healthRoutes);

// Playlists endpoint
app.get("/playlists", async (req, res) => {
  try {
    const playlistsDir = "/media/farbod/128 GB";
    
    // Check if directory exists
    if (!fs.existsSync(playlistsDir)) {
      return res.status(404).json({ error: "Playlists directory not found" });
    }

    // Read directory contents
    const items = fs.readdirSync(playlistsDir);
    
    const playlists = {};
    
    // Filter for MP3 files in root directory
    const mp3Files = items.filter(item => {
      const itemPath = path.join(playlistsDir, item);
      const stats = fs.statSync(itemPath);
      return stats.isFile() && path.extname(item).toLowerCase() === '.mp3';
    });
    
    // Add root MP3 files as "All Songs" if any exist
    if (mp3Files.length > 0) {
      playlists["All Songs"] = mp3Files;
    }
    
    // Look for folders that might contain playlists
    const folders = items.filter(item => {
      const itemPath = path.join(playlistsDir, item);
      const stats = fs.statSync(itemPath);
      return stats.isDirectory();
    });
    
    // Process each folder as a potential playlist
    for (const folder of folders) {
      const folderPath = path.join(playlistsDir, folder);
      try {
        const folderContents = fs.readdirSync(folderPath);
        const folderMp3Files = folderContents.filter(file => {
          const filePath = path.join(folderPath, file);
          const stats = fs.statSync(filePath);
          return stats.isFile() && path.extname(file).toLowerCase() === '.mp3';
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

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Backend API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
