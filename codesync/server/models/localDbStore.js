const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const dataDir = path.join(__dirname, "../data");
const dbFilePath = path.join(dataDir, "local_db.json");

// Ensure data directory and local_db.json exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbData = {
  users: [],
  rooms: [],
  files: [],
};

const loadData = () => {
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, "utf8");
      dbData = JSON.parse(raw);
      if (!Array.isArray(dbData.users)) dbData.users = [];
      if (!Array.isArray(dbData.rooms)) dbData.rooms = [];
      if (!Array.isArray(dbData.files)) dbData.files = [];
    } else {
      saveData();
    }
  } catch (e) {
    console.error("Local DB load error:", e.message);
  }
};

const saveData = () => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 2), "utf8");
  } catch (e) {
    console.error("Local DB save error:", e.message);
  }
};

// Initial load
loadData();

// Helper to generate a new 24-character hex ObjectId
const newId = () => new mongoose.Types.ObjectId().toString();

// Document wrapper that supports .save(), ._id, .toString(), etc.
class LocalDoc {
  constructor(data, collectionName) {
    Object.assign(this, data);
    this._id = this._id || newId();
    this._collection = collectionName;
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const list = dbData[this._collection];
    const index = list.findIndex((x) => x._id.toString() === this._id.toString());
    const plain = { ...this };
    delete plain._collection;

    if (index >= 0) {
      list[index] = plain;
    } else {
      list.push(plain);
    }
    saveData();
    return this;
  }
}

// Chainable Query Builder (supports .populate(), .sort(), .select(), and await)
class LocalQuery {
  constructor(promiseFn) {
    this._promiseFn = promiseFn;
    this._populates = [];
    this._sortRules = null;
    this._selectFields = null;
  }

  populate(field, select) {
    this._populates.push({ field, select });
    return this;
  }

  sort(rules) {
    this._sortRules = rules;
    return this;
  }

  select(fields) {
    this._selectFields = fields;
    return this;
  }

  async _execute() {
    let result = await this._promiseFn();

    // Handle sort if array
    if (Array.isArray(result) && this._sortRules) {
      const keys = Object.keys(this._sortRules);
      result.sort((a, b) => {
        for (const k of keys) {
          const dir = this._sortRules[k];
          if (a[k] !== b[k]) {
            if (dir === -1) return (b[k] > a[k] ? 1 : -1);
            return (a[k] > b[k] ? 1 : -1);
          }
        }
        return 0;
      });
    }

    // Handle populate
    const populateDoc = (doc) => {
      if (!doc) return doc;
      for (const pop of this._populates) {
        if (pop.field === "owner") {
          const u = dbData.users.find((x) => x._id.toString() === doc.owner?.toString());
          if (u) {
            doc.owner = {
              _id: u._id,
              username: u.username,
              email: u.email,
              avatar: u.avatar || "",
            };
          }
        } else if (pop.field === "members") {
          if (Array.isArray(doc.members)) {
            doc.members = doc.members.map((mId) => {
              const u = dbData.users.find((x) => x._id.toString() === mId?.toString());
              if (u) {
                return {
                  _id: u._id,
                  username: u.username,
                  email: u.email,
                  avatar: u.avatar || "",
                };
              }
              return mId;
            });
          }
        }
      }
      return doc;
    };

    if (Array.isArray(result)) {
      result = result.map((d) => populateDoc(d));
    } else if (result) {
      result = populateDoc(result);
    }

    return result;
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

// ================= USER STORE =================
const LocalUserStore = {
  findOne(query) {
    return new LocalQuery(async () => {
      loadData();
      const user = dbData.users.find((u) => {
        if (query.$or) {
          return query.$or.some((cond) => {
            if (cond.email && u.email === cond.email) return true;
            if (cond.username && u.username === cond.username) return true;
            return false;
          });
        }
        if (query.email && u.email !== query.email) return false;
        if (query.username && u.username !== query.username) return false;
        if (query._id && u._id.toString() !== query._id.toString()) return false;
        return true;
      });
      return user ? new LocalDoc(user, "users") : null;
    });
  },

  findById(id) {
    return this.findOne({ _id: id });
  },

  async create(data) {
    loadData();
    const doc = new LocalDoc(
      {
        ...data,
        rooms: data.rooms || [],
        avatar: data.avatar || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "users"
    );
    await doc.save();
    return doc;
  },
};

// ================= ROOM STORE =================
const LocalRoomStore = {
  findOne(query) {
    return new LocalQuery(async () => {
      loadData();
      const room = dbData.rooms.find((r) => {
        if (query.roomId && r.roomId !== query.roomId) return false;
        if (query._id && r._id.toString() !== query._id.toString()) return false;
        return true;
      });
      return room ? new LocalDoc(room, "rooms") : null;
    });
  },

  find(query) {
    return new LocalQuery(async () => {
      loadData();
      let list = dbData.rooms;
      if (query && query.members) {
        const memId = query.members.toString();
        list = list.filter((r) =>
          Array.isArray(r.members) &&
          r.members.some((m) => m?.toString() === memId)
        );
      }
      return list.map((r) => new LocalDoc(r, "rooms"));
    });
  },

  async create(data) {
    loadData();
    const doc = new LocalDoc(
      {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "rooms"
    );
    await doc.save();
    return doc;
  },

  async findByIdAndDelete(id) {
    loadData();
    const idStr = id.toString();
    const index = dbData.rooms.findIndex((r) => r._id.toString() === idStr || r.roomId === idStr);
    if (index >= 0) {
      const removed = dbData.rooms.splice(index, 1)[0];
      saveData();
      return removed;
    }
    return null;
  },
};

// ================= FILE STORE =================
const LocalFileStore = {
  find(query) {
    return new LocalQuery(async () => {
      loadData();
      let list = dbData.files;
      if (query && query.room) {
        const roomIdStr = query.room.toString();
        list = list.filter((f) => f.room?.toString() === roomIdStr);
      }
      return list.map((f) => new LocalDoc(f, "files"));
    });
  },

  findOne(query) {
    return new LocalQuery(async () => {
      loadData();
      const file = dbData.files.find((f) => {
        if (query._id && f._id.toString() !== query._id.toString()) return false;
        if (query.room && f.room?.toString() !== query.room.toString()) return false;
        if (query.path && f.path !== query.path) return false;
        return true;
      });
      return file ? new LocalDoc(file, "files") : null;
    });
  },

  async create(data) {
    loadData();
    const doc = new LocalDoc(
      {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "files"
    );
    await doc.save();
    return doc;
  },

  async insertMany(docs) {
    loadData();
    const created = [];
    for (const d of docs) {
      const doc = new LocalDoc(
        {
          ...d,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        "files"
      );
      dbData.files.push({ ...doc });
      created.push(doc);
    }
    saveData();
    return created;
  },

  async findByIdAndUpdate(id, update, options) {
    loadData();
    const idStr = id.toString();
    const file = dbData.files.find((f) => f._id.toString() === idStr);
    if (file) {
      if (update.content !== undefined) file.content = update.content;
      if (update.name !== undefined) file.name = update.name;
      if (update.path !== undefined) file.path = update.path;
      file.updatedAt = new Date().toISOString();
      saveData();
      return new LocalDoc(file, "files");
    }
    return null;
  },

  async findByIdAndDelete(id) {
    loadData();
    const idStr = id.toString();
    const idx = dbData.files.findIndex((f) => f._id.toString() === idStr);
    if (idx >= 0) {
      const removed = dbData.files.splice(idx, 1)[0];
      saveData();
      return removed;
    }
    return null;
  },

  async deleteMany(query) {
    loadData();
    if (!query) return { deletedCount: 0 };
    const roomIdStr = query.room?.toString();
    const beforeCount = dbData.files.length;

    dbData.files = dbData.files.filter((f) => {
      if (roomIdStr && f.room?.toString() !== roomIdStr) return true;
      if (query.path instanceof RegExp) {
        if (!query.path.test(f.path)) return true;
      }
      return false; // delete this file
    });

    const deletedCount = beforeCount - dbData.files.length;
    saveData();
    return { deletedCount };
  },
};

module.exports = {
  LocalUserStore,
  LocalRoomStore,
  LocalFileStore,
};
