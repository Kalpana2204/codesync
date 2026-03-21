const Room = require("../models/Room");
const File = require("../models/File");
const { v4: uuidv4 } = require("uuid");

// Create Room
const createRoom = async (req, res) => {
  try {
    const { name, language, isPrivate } = req.body;

    const room = await Room.create({
      name,
      language: language || "javascript",
      isPrivate: isPrivate || false,
      roomId: uuidv4(),
      owner: req.user.id,
      members: [req.user.id],
    });

    // Create a default file for the room
    await File.create({
      name: "main.js",
      content: "// Start coding here\n",
      language: language || "javascript",
      room: room._id,
    });

    res.status(201).json({ message: "Room created", room });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Join Room
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Add member if not already in room
    if (!room.members.includes(req.user.id)) {
      room.members.push(req.user.id);
      await room.save();
    }

    res.status(200).json({ message: "Joined room", room });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Room by roomId
const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate("owner", "username email avatar")
      .populate("members", "username email avatar");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Get all files in this room
    const files = await File.find({ room: room._id });

    res.status(200).json({ room, files });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all rooms of logged in user
const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user.id })
      .populate("owner", "username email avatar")
      .sort({ updatedAt: -1 });

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete Room
const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Only owner can delete
    if (room.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can delete room" });
    }

    await Room.findByIdAndDelete(room._id);
    await File.deleteMany({ room: room._id });

    res.status(200).json({ message: "Room deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createRoom, joinRoom, getRoom, getMyRooms, deleteRoom };
