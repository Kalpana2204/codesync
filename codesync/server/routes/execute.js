const express = require("express");
const router = express.Router();
const {
  executeCode,
  askAI,
  reviewCode,
  explainCode,
  suggestFix,
} = require("../controllers/executionController");
const authMiddleware = require("../middleware/authMiddleware");

// Code Execution
router.post("/run", authMiddleware, executeCode);

// AI Endpoints (Powered by Google Gemini Flash)
router.post("/ai", authMiddleware, askAI);
router.post("/ai/review", authMiddleware, reviewCode);
router.post("/ai/explain", authMiddleware, explainCode);
router.post("/ai/fix", authMiddleware, suggestFix);

module.exports = router;
