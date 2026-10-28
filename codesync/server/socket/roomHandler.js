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
        rooms.get(roomId).users.set(socket.id, {
          username,
          cursor: null,
          activeFileId: null,
        });

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

    // User switches active file
    socket.on("active-file-change", ({ roomId, fileId, username }) => {
      try {
        if (rooms.has(roomId) && rooms.get(roomId).users.has(socket.id)) {
          const u = rooms.get(roomId).users.get(socket.id);
          u.activeFileId = fileId;
        }
        socket.to(roomId).emit("user-file-change", {
          socketId: socket.id,
          username,
          fileId,
        });
      } catch (error) {
        console.error("active-file-change error:", error.message);
      }
    });

    // Code change for a specific file
    socket.on("code-change", ({ roomId, fileId, code }) => {
      try {
        socket.to(roomId).emit("code-update", { fileId, code });
      } catch (error) {
        console.error("code-change error:", error.message);
      }
    });

    // Save code to MongoDB
    socket.on("save-code", async ({ fileId, code, roomId }) => {
      try {
        if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) return;
        const updated = await File.findByIdAndUpdate(
          fileId,
          { content: code },
          { new: true }
        );
        socket.emit("code-saved", {
          message: "Code saved ✅",
          fileId,
          updatedAt: updated?.updatedAt,
        });
        if (roomId) {
          socket.to(roomId).emit("file-synced", { fileId, code });
        }
      } catch (error) {
        console.error("save-code error:", error.message);
        socket.emit("error", { message: "Failed to save code" });
      }
    });

    // File created in project tree
    socket.on("file-created", ({ roomId, file }) => {
      try {
        socket.to(roomId).emit("file-created", { file });
      } catch (error) {
        console.error("file-created error:", error.message);
      }
    });

    // File deleted from project tree
    socket.on("file-deleted", ({ roomId, fileId }) => {
      try {
        socket.to(roomId).emit("file-deleted", { fileId });
      } catch (error) {
        console.error("file-deleted error:", error.message);
      }
    });

    // File or folder renamed
    socket.on("file-renamed", ({ roomId, file, allFiles }) => {
      try {
        socket.to(roomId).emit("file-renamed", { file, allFiles });
      } catch (error) {
        console.error("file-renamed error:", error.message);
      }
    });

    // Entire project refreshed (e.g. after ZIP import)
    socket.on("project-refreshed", ({ roomId, files }) => {
      try {
        socket.to(roomId).emit("project-refreshed", { files });
      } catch (error) {
        console.error("project-refreshed error:", error.message);
      }
    });

    // Cursor position change (per-file)
    socket.on("cursor-change", ({ roomId, fileId, cursor, username }) => {
      try {
        if (rooms.has(roomId) && rooms.get(roomId).users.has(socket.id)) {
          rooms.get(roomId).users.get(socket.id).cursor = cursor;
        }
        socket.to(roomId).emit("cursor-update", {
          socketId: socket.id,
          fileId,
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
        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        socket.to(roomId).emit("chat-message", { username, text, timestamp });
      } catch (error) {
        console.error("send-chat error:", error.message);
      }
    });

    // Broadcast execution run output to everyone in the room
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
    socket.on("webrtc:ready", ({ roomId }) => {
      try {
        socket.to(roomId).emit("webrtc:user-joined", { from: socket.id });

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

    socket.on("webrtc:offer", ({ offer, to }) => {
      try {
        io.to(to).emit("webrtc:offer", { offer, from: socket.id });
      } catch (error) {
        console.error("webrtc:offer error:", error.message);
      }
    });

    socket.on("webrtc:answer", ({ answer, to }) => {
      try {
        io.to(to).emit("webrtc:answer", { answer, from: socket.id });
      } catch (error) {
        console.error("webrtc:answer error:", error.message);
      }
    });

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
