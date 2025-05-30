const express = require("express");
const router = express.Router();

// GET /api/health - Health check endpoint
router.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// GET /api/health/db - Database health check (placeholder)
router.get("/db", (req, res) => {
  // In a real application, you would test the database connection here
  res.json({
    status: "OK",
    message: "Database connection is healthy",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
