const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const executeRoutes = require("./routes/execute");
const { initSocket } = require("./socket/roomHandler");

const app = express();
const server = http.createServer(app);

// SIGTERM and SIGINT must be after server is created
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/execute", executeRoutes);

// Socket init
initSocket(io);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB error:", err));

// Start server
server.listen(process.env.PORT, () => {
  console.log(`✅ Server running on port ${process.env.PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${process.env.PORT} is already in use. Please kill the process first.`);
    process.exit(1);
  }
});