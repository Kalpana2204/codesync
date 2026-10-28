const mongoose = require("mongoose");
const { LocalRoomStore } = require("./localDbStore");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    language: {
      type: String,
      default: "javascript",
      enum: ["javascript", "python", "cpp", "java"],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const MongooseRoomModel = mongoose.models.Room || mongoose.model("Room", roomSchema);

// Intelligent proxy: routes to Mongoose if connected, otherwise local store
const RoomProxy = new Proxy(MongooseRoomModel, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return target[prop];
    }
    if (prop in LocalRoomStore) {
      return LocalRoomStore[prop];
    }
    return target[prop];
  },
});

module.exports = RoomProxy;
