import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await API.get("/rooms/my-rooms");
      setRooms(res.data.rooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!roomName.trim()) return;
    try {
      const res = await API.post("/rooms/create", { name: roomName, language });
      setRooms([res.data.room, ...rooms]);
      setShowCreate(false);
      setRoomName("");
      navigate(`/room/${res.data.room.roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    }
  };

  const joinRoom = async () => {
    if (!joinId.trim()) return;
    try {
      await API.post(`/rooms/join/${joinId}`);
      navigate(`/room/${joinId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Room not found");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Code<span className="text-blue-500">Sync</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">👋 {user?.username}</span>
          <button
            onClick={handleLogout}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 rounded-lg p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold transition"
          >
            + Create Room
          </button>
          <div className="flex gap-2 flex-1 max-w-sm">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="Paste Room ID to join..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={joinRoom}
              className="bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-bold transition text-sm"
            >
              Join
            </button>
          </div>
        </div>

        {/* Create Room Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-6">Create New Room</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="My Awesome Project"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={createRoom}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-bold transition"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-bold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rooms Grid */}
        <h2 className="text-xl font-bold mb-4">My Rooms</h2>
        {loading ? (
          <p className="text-gray-400">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-5xl mb-4">🏠</p>
            <p className="text-lg">No rooms yet. Create your first room!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room._id}
                onClick={() => navigate(`/room/${room.roomId}`)}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl p-5 cursor-pointer transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{room.name}</h3>
                  <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                    {room.language}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mb-3">
                  ID: {room.roomId.slice(0, 8)}...
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">
                    👥 {room.members?.length} member{room.members?.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(room.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;