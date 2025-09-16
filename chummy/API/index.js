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
const playlistRoutes = require("./routes/playlist");
const usbRoutes = require("./routes/usb");

// Use routes
app.use("/health", healthRoutes);
app.use("/playlist", playlistRoutes);
app.use("/usb", usbRoutes);

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Chummy API is running!",
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
