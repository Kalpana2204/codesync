const mongoose = require("mongoose");
const { LocalUserStore } = require("./localDbStore");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      default: null, // null for GitHub OAuth users
    },
    avatar: {
      type: String,
      default: "",
    },
    githubId: {
      type: String,
      default: null,
    },
    rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
      },
    ],
  },
  { timestamps: true }
);

const MongooseUserModel = mongoose.models.User || mongoose.model("User", userSchema);

// Intelligent proxy: routes to Mongoose if connected, otherwise local store
const UserProxy = new Proxy(MongooseUserModel, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return target[prop];
    }
    if (prop in LocalUserStore) {
      return LocalUserStore[prop];
    }
    return target[prop];
  },
});

module.exports = UserProxy;
