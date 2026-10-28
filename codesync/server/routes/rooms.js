const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max zip
});

const {
  createRoom,
  joinRoom,
  getRoom,
  getMyRooms,
  deleteRoom,
  createFile,
  updateFile,
  renameFile,
  deleteFile,
  exportZip,
  importZip,
} = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");

// Room routes
router.post("/create", authMiddleware, createRoom);
router.get("/my-rooms", authMiddleware, getMyRooms);
router.get("/:roomId", authMiddleware, getRoom);
router.post("/join/:roomId", authMiddleware, joinRoom);
router.delete("/:roomId", authMiddleware, deleteRoom);

// Multi-file & folder endpoints
router.post("/:roomId/files", authMiddleware, createFile);
router.put("/:roomId/files/:fileId", authMiddleware, updateFile);
router.patch("/:roomId/files/:fileId/rename", authMiddleware, renameFile);
router.delete("/:roomId/files/:fileId", authMiddleware, deleteFile);

// ZIP Import & Export
router.get("/:roomId/export-zip", authMiddleware, exportZip);
router.post("/:roomId/import-zip", authMiddleware, upload.single("zipFile"), importZip);

module.exports = router;
