const File = require("../models/File");
const mongoose = require("mongoose");

const rooms = new Map();

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("⚡ New client connected:", socket.id);

    // Join a room
    socket.on("join-room", async ({ roomId, username }) => {
      try {
        socket.join(roomId);

        if (!rooms.has(roomId)) {
          rooms.set(roomId, { users: new Map() });
        }
        rooms.get(roomId).users.set(socket.id, { username, cursor: null });

        console.log(`✅ ${username} joined room ${roomId}`);

        socket.to(roomId).emit("user-joined", {
          socketId: socket.id,
          username,
          users: Array.from(rooms.get(roomId).users.entries()),
        });

        socket.emit("room-users", {
          users: Array.from(rooms.get(roomId).users.entries()),
        });
      } catch (error) {
        console.error("join-room error:", error.message);
      }
    });

    // Code change
    socket.on("code-change", ({ roomId, fileId, code }) => {
      try {
        socket.to(roomId).emit("code-update", { fileId, code });
      } catch (error) {
        console.error("code-change error:", error.message);
      }
    });

    // Save code
    socket.on("save-code", async ({ fileId, code }) => {
      try {
        if (!fileId) return;
        if (!mongoose.Types.ObjectId.isValid(fileId)) return;
        await File.findByIdAndUpdate(fileId, { content: code });
        socket.emit("code-saved", { message: "Code saved ✅" });
      } catch (error) {
        console.error("save-code error:", error.message);
        socket.emit("error", { message: "Failed to save code" });
      }
    });

    // Cursor position change
    socket.on("cursor-change", ({ roomId, cursor, username }) => {
      try {
        socket.to(roomId).emit("cursor-update", {
          socketId: socket.id,
          cursor,
          username,
        });
      } catch (error) {
        console.error("cursor-change error:", error.message);
      }
    });

    // Language change
    socket.on("language-change", ({ roomId, language }) => {
      try {
        socket.to(roomId).emit("language-update", { language });
      } catch (error) {
        console.error("language-change error:", error.message);
      }
    });

    // Chat message
    socket.on("send-chat", ({ roomId, username, text }) => {
      try {
        socket.to(roomId).emit("chat-message", { username, text });
      } catch (error) {
        console.error("send-chat error:", error.message);
      }
    });

    // ← NEW: Broadcast run output to everyone else in the room
    socket.on("run-output", ({ roomId, output, username }) => {
      try {
        socket.to(roomId).emit("run-output", { output, username });
      } catch (error) {
        console.error("run-output error:", error.message);
      }
    });

    // ─────────────────────────────────────────────
    // WebRTC Signaling
    // ─────────────────────────────────────────────

    // A user is ready to receive video calls in this room
    socket.on("webrtc:ready", ({ roomId }) => {
      try {
        // Tell all existing users that a new peer joined (they send offers to the new user)
        socket.to(roomId).emit("webrtc:user-joined", { from: socket.id });

        // Also send the new user a list of ALL existing users in the room
        // so they can initiate connections to everyone already present
        if (rooms.has(roomId)) {
          const existingUsers = Array.from(rooms.get(roomId).users.keys()).filter(
            (id) => id !== socket.id
          );
          socket.emit("webrtc:existing-users", { users: existingUsers });
        }

        console.log(`📹 ${socket.id} is ready for WebRTC in room ${roomId}`);
      } catch (error) {
        console.error("webrtc:ready error:", error.message);
      }
    });

    // Relay SDP offer from one peer to another
    socket.on("webrtc:offer", ({ offer, to }) => {
      try {
        io.to(to).emit("webrtc:offer", { offer, from: socket.id });
      } catch (error) {
        console.error("webrtc:offer error:", error.message);
      }
    });

    // Relay SDP answer from one peer to another
    socket.on("webrtc:answer", ({ answer, to }) => {
      try {
        io.to(to).emit("webrtc:answer", { answer, from: socket.id });
      } catch (error) {
        console.error("webrtc:answer error:", error.message);
      }
    });

    // Relay ICE candidates between peers
    socket.on("webrtc:ice-candidate", ({ candidate, to }) => {
      try {
        io.to(to).emit("webrtc:ice-candidate", { candidate, from: socket.id });
      } catch (error) {
        console.error("webrtc:ice-candidate error:", error.message);
      }
    });

    // ─────────────────────────────────────────────
    // Handle disconnection
    // ─────────────────────────────────────────────
    socket.on("disconnect", () => {
      try {
        console.log("❌ Client disconnected:", socket.id);

        rooms.forEach((roomData, roomId) => {
          if (roomData.users.has(socket.id)) {
            const username = roomData.users.get(socket.id).username;
            roomData.users.delete(socket.id);

            socket.to(roomId).emit("user-left", {
              socketId: socket.id,
              username,
              users: Array.from(roomData.users.entries()),
            });

            // Notify peers to close their WebRTC connection with this socket
            socket.to(roomId).emit("webrtc:user-left", { from: socket.id });
          }
        });
      } catch (error) {
        console.error("disconnect error:", error.message);
      }
    });
  });
};

module.exports = { initSocket };