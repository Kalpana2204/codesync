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

// SIGTERM and SIGINT handlers
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
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ No MONGO_URI specified in .env");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 });
    console.log("✅ MongoDB connected successfully to", process.env.MONGO_URI.split("@")[1] || "database");
  } catch (err) {
    console.warn("⚠️ MongoDB connection warning:", err.message);
    console.warn("👉 Tip: Check your Atlas cluster status or update MONGO_URI in codesync/server/.env");
  }
};

connectDB();

// Start server
server.listen(process.env.PORT || 5000, () => {
  console.log(`✅ CodeSync Server running on port ${process.env.PORT || 5000}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${process.env.PORT || 5000} is already in use.`);
    process.exit(1);
  }
});