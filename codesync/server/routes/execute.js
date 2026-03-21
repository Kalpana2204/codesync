const express = require("express");
const router = express.Router();
const { executeCode, askAI } = require("../controllers/executionController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/run", authMiddleware, executeCode);
router.post("/ai", authMiddleware, askAI);

module.exports = router;