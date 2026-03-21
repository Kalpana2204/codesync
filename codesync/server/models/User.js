const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
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

module.exports = mongoose.model("User", userSchema);
