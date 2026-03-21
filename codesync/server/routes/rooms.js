const express = require("express");
const router = express.Router();
const {
  createRoom,
  joinRoom,
  getRoom,
  getMyRooms,
  deleteRoom,
} = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create", authMiddleware, createRoom);
router.get("/my-rooms", authMiddleware, getMyRooms);
router.get("/:roomId", authMiddleware, getRoom);
router.post("/join/:roomId", authMiddleware, joinRoom);
router.delete("/:roomId", authMiddleware, deleteRoom);

module.exports = router;