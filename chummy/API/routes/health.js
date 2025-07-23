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


module.exports = router;
