const mongoose = require("mongoose");
const { LocalFileStore } = require("./localDbStore");

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    isFolder: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "javascript",
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
  },
  { timestamps: true }
);

fileSchema.index({ room: 1, path: 1 }, { unique: true });

const MongooseFileModel = mongoose.models.File || mongoose.model("File", fileSchema);

// Intelligent proxy: routes to Mongoose if connected, otherwise local store
const FileProxy = new Proxy(MongooseFileModel, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return target[prop];
    }
    if (prop in LocalFileStore) {
      return LocalFileStore[prop];
    }
    return target[prop];
  },
});

module.exports = FileProxy;
