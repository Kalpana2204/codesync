const Room = require("../models/Room");
const File = require("../models/File");
const { v4: uuidv4 } = require("uuid");
const AdmZip = require("adm-zip");
const { detectLanguage } = require("../utils/languageHelper");

// Helper to normalize path (unix-style, no leading/trailing slashes)
const normalizePath = (rawPath) => {
  if (!rawPath) return "";
  let p = rawPath.replace(/\\/g, "/").trim();
  p = p.replace(/^\/+/, "").replace(/\/+$/, "");
  // Remove duplicate slashes
  p = p.replace(/\/+/g, "/");
  return p;
};

// Create Room
const createRoom = async (req, res) => {
  try {
    const { name, language, isPrivate } = req.body;
    const selectedLang = language || "javascript";

    const room = await Room.create({
      name: name.trim(),
      language: selectedLang,
      isPrivate: isPrivate || false,
      roomId: uuidv4(),
      owner: req.user.id,
      members: [req.user.id],
    });

    // Starter files based on chosen primary language
    const starterFiles = [];
    if (selectedLang === "python") {
      starterFiles.push({
        name: "main.py",
        path: "main.py",
        content: `# CodeSync Python Workspace\n\ndef main():\n    print("Welcome to CodeSync!")\n\nif __name__ == "__main__":\n    main()\n`,
        language: "python",
        isFolder: false,
        room: room._id,
      });
    } else if (selectedLang === "cpp") {
      starterFiles.push({
        name: "main.cpp",
        path: "main.cpp",
        content: `// CodeSync C++ Workspace\n#include <iostream>\n\nint main() {\n    std::cout << "Welcome to CodeSync!" << std::endl;\n    return 0;\n}\n`,
        language: "cpp",
        isFolder: false,
        room: room._id,
      });
    } else if (selectedLang === "java") {
      starterFiles.push({
        name: "Main.java",
        path: "Main.java",
        content: `// CodeSync Java Workspace\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to CodeSync!");\n    }\n}\n`,
        language: "java",
        isFolder: false,
        room: room._id,
      });
    } else {
      // Default Javascript
      starterFiles.push({
        name: "index.js",
        path: "index.js",
        content: `// CodeSync JavaScript Workspace\nconsole.log("Welcome to CodeSync!");\n`,
        language: "javascript",
        isFolder: false,
        room: room._id,
      });
    }

    // Add a README.md to demonstrate multi-file project workspace
    starterFiles.push({
      name: "README.md",
      path: "README.md",
      content: `# ${name}\n\nCollaborative project workspace created on CodeSync.\n\n- Primary Language: \`${selectedLang}\`\n- Workspace ID: \`${room.roomId}\`\n`,
      language: "markdown",
      isFolder: false,
      room: room._id,
    });

    await File.insertMany(starterFiles);

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
    if (!room.members.some((m) => m.toString() === req.user.id)) {
      room.members.push(req.user.id);
      await room.save();
    }

    res.status(200).json({ message: "Joined room", room });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Room by roomId with all files
const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate("owner", "username email avatar")
      .populate("members", "username email avatar");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Get all files sorted by path
    const files = await File.find({ room: room._id }).sort({ isFolder: -1, path: 1 });

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

// Create a file or folder in a room
const createFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, path: rawPath, isFolder = false, content = "" } = req.body;

    if (!name && !rawPath) {
      return res.status(400).json({ message: "Name or path is required" });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const normalizedPath = normalizePath(rawPath || name);
    const fileName = name || normalizedPath.split("/").pop();

    if (!normalizedPath) {
      return res.status(400).json({ message: "Invalid file path" });
    }

    // Check if path already exists
    const existing = await File.findOne({ room: room._id, path: normalizedPath });
    if (existing) {
      return res.status(400).json({ message: "A file or folder with this path already exists" });
    }

    const language = isFolder ? "folder" : detectLanguage(normalizedPath, room.language);

    const file = await File.create({
      name: fileName,
      path: normalizedPath,
      isFolder: Boolean(isFolder),
      content: isFolder ? "" : content,
      language,
      room: room._id,
    });

    res.status(201).json({ message: "File created", file });
  } catch (error) {
    res.status(500).json({ message: "Failed to create file", error: error.message });
  }
};

// Update file content
const updateFile = async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    const { content } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const file = await File.findOne({ _id: fileId, room: room._id });
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.isFolder) {
      return res.status(400).json({ message: "Cannot write content to a folder" });
    }

    file.content = content !== undefined ? content : file.content;
    await file.save();

    res.status(200).json({ message: "File updated", file });
  } catch (error) {
    res.status(500).json({ message: "Failed to update file", error: error.message });
  }
};

// Rename file or folder
const renameFile = async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    const { newName } = req.body;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ message: "New name is required" });
    }

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const file = await File.findOne({ _id: fileId, room: room._id });
    if (!file) return res.status(404).json({ message: "File not found" });

    const trimmedName = newName.trim();
    const oldPath = file.path;
    const pathParts = oldPath.split("/");
    pathParts[pathParts.length - 1] = trimmedName;
    const newPath = pathParts.join("/");

    // Check if new path collision exists
    const collision = await File.findOne({ room: room._id, path: newPath, _id: { $ne: file._id } });
    if (collision) {
      return res.status(400).json({ message: "A file or folder with this name already exists at this location" });
    }

    if (file.isFolder) {
      // Cascade rename all child files & subfolders whose path begins with oldPath + "/"
      const children = await File.find({
        room: room._id,
        path: new RegExp(`^${oldPath}/`),
      });

      for (const child of children) {
        const updatedChildPath = child.path.replace(new RegExp(`^${oldPath}/`), `${newPath}/`);
        child.path = updatedChildPath;
        await child.save();
      }
    }

    file.name = trimmedName;
    file.path = newPath;
    if (!file.isFolder) {
      file.language = detectLanguage(newPath, file.language);
    }
    await file.save();

    const allFiles = await File.find({ room: room._id }).sort({ isFolder: -1, path: 1 });
    res.status(200).json({ message: "Renamed successfully", file, allFiles });
  } catch (error) {
    res.status(500).json({ message: "Failed to rename file", error: error.message });
  }
};

// Delete file or folder (cascade delete for folders)
const deleteFile = async (req, res) => {
  try {
    const { roomId, fileId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const file = await File.findOne({ _id: fileId, room: room._id });
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.isFolder) {
      // Cascade delete all files and subfolders under this folder
      await File.deleteMany({
        room: room._id,
        path: new RegExp(`^${file.path}(/|$)`),
      });
    } else {
      await File.findByIdAndDelete(file._id);
    }

    const remainingFiles = await File.find({ room: room._id }).sort({ isFolder: -1, path: 1 });
    res.status(200).json({ message: "Deleted successfully", remainingFiles });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete file", error: error.message });
  }
};

// Export project as a ZIP archive
const exportZip = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const files = await File.find({ room: room._id });
    const zip = new AdmZip();

    files.forEach((f) => {
      if (f.isFolder) {
        zip.addFile(`${f.path}/`, Buffer.alloc(0));
      } else {
        zip.addFile(f.path, Buffer.from(f.content || "", "utf8"));
      }
    });

    const zipBuffer = zip.toBuffer();
    const safeName = (room.name || "project").replace(/[^a-zA-Z0-9_-]/g, "_");

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
      "Content-Length": zipBuffer.length,
    });

    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ message: "Failed to export zip", error: error.message });
  }
};

// Import project from an uploaded ZIP archive
const importZip = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No ZIP file uploaded" });
    }

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    const ignoredPatterns = [
      /__MACOSX/,
      /\.DS_Store/,
      /node_modules\//,
      /\.git\//,
      /\.env/,
      /\.zip$/,
    ];

    const filesToInsert = [];
    const createdPaths = new Set();

    for (const entry of zipEntries) {
      let entryPath = normalizePath(entry.entryName);
      if (!entryPath) continue;

      if (ignoredPatterns.some((rx) => rx.test(entryPath))) {
        continue;
      }

      const isFolder = entry.isDirectory;
      const fileName = entryPath.split("/").pop();

      // Ensure intermediate parent folders exist
      const parts = entryPath.split("/");
      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join("/");
        if (!createdPaths.has(parentPath)) {
          createdPaths.add(parentPath);
          filesToInsert.push({
            name: parts[i - 1],
            path: parentPath,
            isFolder: true,
            content: "",
            language: "folder",
            room: room._id,
          });
        }
      }

      if (!createdPaths.has(entryPath)) {
        createdPaths.add(entryPath);
        let content = "";
        if (!isFolder) {
          try {
            content = entry.getData().toString("utf8");
          } catch {
            content = "";
          }
        }

        filesToInsert.push({
          name: fileName,
          path: entryPath,
          isFolder,
          content,
          language: isFolder ? "folder" : detectLanguage(entryPath, room.language),
          room: room._id,
        });
      }
    }

    // Merge or replace: if file with same path exists, update content; otherwise insert
    for (const item of filesToInsert) {
      const existing = await File.findOne({ room: room._id, path: item.path });
      if (existing) {
        if (!existing.isFolder && !item.isFolder) {
          existing.content = item.content;
          await existing.save();
        }
      } else {
        await File.create(item);
      }
    }

    const allFiles = await File.find({ room: room._id }).sort({ isFolder: -1, path: 1 });
    res.status(200).json({ message: "ZIP imported successfully", files: allFiles });
  } catch (error) {
    res.status(500).json({ message: "Failed to import zip", error: error.message });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  getMyRooms,
  deleteRoom,
  createFile,
  updateFile,
  renameFile,
  deleteFile,
  exportZip,
  importZip,
};
