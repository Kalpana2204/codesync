import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import { io } from "socket.io-client";
import useWebRTC from "../hooks/useWebRTC";
import VideoChat from "../components/VideoChat";

const SOCKET_URL = "https://codesync-production-ccd9.up.railway.app";

const Room = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [code, setCode] = useState("// Start coding here\n");
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers] = useState([]);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const socketRef = useRef(null);
  const codeRef = useRef(code);

  const { localStream, peers, micOn, camOn, toggleMic, toggleCam } = useWebRTC(
    socketRef,
    roomId,
    showVideo
  );

  // Fetch room data
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await API.get(`/rooms/${roomId}`);
        setRoom(res.data.room);
        setFiles(res.data.files);
        setLanguage(res.data.room.language);
        if (res.data.files.length > 0) {
          setActiveFile(res.data.files[0]);
          setCode(res.data.files[0].content);
          codeRef.current = res.data.files[0].content;
        }
      } catch (err) {
        console.error(err);
        navigate("/dashboard");
      }
    };
    fetchRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Socket setup
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { withCredentials: true });

    socketRef.current.emit("join-room", {
      roomId,
      username: user?.username,
    });

    socketRef.current.on("code-update", ({ fileId, code }) => {
      setCode(code);
      codeRef.current = code;
    });

    socketRef.current.on("room-users", ({ users }) => {
      setUsers(users);
    });

    socketRef.current.on("user-joined", ({ username, users }) => {
      setUsers(users);
      setChatMessages((prev) => [
        ...prev,
        { system: true, text: `${username} joined the room` },
      ]);
    });

    socketRef.current.on("user-left", ({ username, users }) => {
      setUsers(users);
      setChatMessages((prev) => [
        ...prev,
        { system: true, text: `${username} left the room` },
      ]);
    });

    socketRef.current.on("chat-message", ({ username, text }) => {
      setChatMessages((prev) => [...prev, { username, text }]);
    });

    socketRef.current.on("code-saved", () => {
      setIsSaved(true);
    });

    // ← NEW: receive shared output from whoever clicked Run
    socketRef.current.on("run-output", ({ output, username }) => {
      setOutput(`${output}\n\n▶ Ran by ${username}`);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, user]);

  // Handle code change
  const handleCodeChange = (value) => {
    setCode(value);
    codeRef.current = value;
    setIsSaved(false);
    socketRef.current.emit("code-change", {
      roomId,
      fileId: activeFile?._id,
      code: value,
    });
  };

  // Save code
  const handleSave = () => {
    socketRef.current.emit("save-code", {
      fileId: activeFile?._id,
      code: codeRef.current,
    });
  };

  // Copy room ID
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied! Share it with your friends 🎉");
  };

  // Send chat message
  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current.emit("send-chat", {
      roomId,
      username: user?.username,
      text: chatInput,
    });
    setChatMessages((prev) => [
      ...prev,
      { username: user?.username, text: chatInput, self: true },
    ]);
    setChatInput("");
  };

  // End call + leave room
  const handleEndCall = () => {
    setShowVideo(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    navigate("/dashboard");
  };

  // ← UPDATED: Run code + broadcast output to everyone
  const runCode = async () => {
    setIsRunning(true);
    setOutput("⏳ Running code...");
    try {
      const res = await API.post("/execute/run", {
        code: codeRef.current,
        language,
      });
      const result = `Status: ${res.data.status}\n\n${res.data.output}`;
      setOutput(result);

      // Broadcast output to all other users in the room
      socketRef.current.emit("run-output", {
        roomId,
        output: result,
        username: user?.username,
      });
    } catch (err) {
      setOutput("❌ Execution failed: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Ask AI
  const askAI = async () => {
    if (!aiInput.trim()) return;
    const userMessage = aiInput;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setAiLoading(true);
    try {
      const res = await API.post("/execute/ai", {
        message: userMessage,
        code: codeRef.current,
        language,
      });
      setAiMessages((prev) => [
        ...prev,
        { role: "ai", text: res.data.reply },
      ]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { role: "ai", text: "❌ AI failed to respond. Please try again." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400 text-xl">Loading room...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1
            className="text-xl font-bold cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            Code<span className="text-blue-500">Sync</span>
          </h1>
          <span className="text-gray-400 text-sm">/</span>
          <span className="text-gray-300 font-medium">{room.name}</span>
          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Online users */}
          <div className="flex items-center gap-1">
            {users.slice(0, 4).map(([id, u], i) => (
              <div
                key={id}
                className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold"
                title={u.username}
              >
                {u.username?.[0]?.toUpperCase()}
              </div>
            ))}
            <span className="text-gray-400 text-sm ml-1">
              {users.length} online
            </span>
          </div>

          {/* Save status */}
          <span className={`text-xs ${isSaved ? "text-green-400" : "text-yellow-400"}`}>
            {isSaved ? "✅ Saved" : "● Unsaved"}
          </span>

          <button
            onClick={handleSave}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm transition"
          >
            Save
          </button>
          <button
            onClick={copyRoomId}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm transition"
          >
            📋 Share
          </button>
          <button
            onClick={runCode}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-lg text-sm font-bold transition disabled:opacity-50"
          >
            ▶ Run
          </button>
          <button
            onClick={() => { setShowAI(!showAI); setShowChat(false); setShowVideo(false); }}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg text-sm transition"
          >
            🤖 AI
          </button>
          <button
            onClick={() => { setShowChat(!showChat); setShowAI(false); setShowVideo(false); }}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm transition"
          >
            💬 Chat
          </button>
          <button
            onClick={() => { setShowVideo(!showVideo); setShowAI(false); setShowChat(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              showVideo
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            📹 Video
          </button>
          <button
            onClick={handleEndCall}
            className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-sm font-bold transition"
          >
            📵 Leave
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Tree */}
        <div className="w-48 bg-gray-800 border-r border-gray-700 p-3 shrink-0">
          <p className="text-gray-400 text-xs uppercase font-bold mb-3">Files</p>
          {files.map((file) => (
            <div
              key={file._id}
              onClick={() => {
                setActiveFile(file);
                setCode(file.content);
              }}
              className={`px-3 py-2 rounded-lg cursor-pointer text-sm mb-1 ${
                activeFile?._id === file._id
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-700"
              }`}
            >
              📄 {file.name}
            </div>
          ))}
        </div>

        {/* Editor + Output */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                formatOnPaste: true,
              }}
            />
          </div>

          {/* Output Panel */}
          <div className="h-36 bg-gray-950 border-t border-gray-700 p-3 overflow-auto shrink-0">
            <p className="text-gray-400 text-xs uppercase font-bold mb-2">Output</p>
            <pre className="text-green-400 text-sm font-mono">
              {output || "// Click ▶ Run to execute your code"}
            </pre>
          </div>
        </div>

        {/* Video Panel */}
        {showVideo && (
          <div className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
            <VideoChat
              localStream={localStream}
              peers={peers}
              micOn={micOn}
              camOn={camOn}
              toggleMic={toggleMic}
              toggleCam={toggleCam}
              onEndCall={handleEndCall}
            />
          </div>
        )}

        {/* AI Panel */}
        {showAI && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-700 flex items-center gap-2">
              <span>🤖</span>
              <p className="font-bold text-sm">AI Assistant</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {aiMessages.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="text-3xl mb-3">🤖</p>
                  <p>Ask me anything about your code!</p>
                  <div className="mt-4 space-y-2">
                    {["Explain this code", "Fix any bugs", "Optimize this code"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setAiInput(s)}
                        className="block w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`${msg.role === "user" ? "text-right" : ""}`}>
                  <p className="text-gray-400 text-xs mb-1">
                    {msg.role === "user" ? "You" : "🤖 AI"}
                  </p>
                  <div className={`text-sm px-3 py-2 rounded-lg inline-block max-w-full text-left whitespace-pre-wrap ${
                    msg.role === "user" ? "bg-blue-600" : "bg-gray-700"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="text-gray-400 text-sm">🤖 AI is thinking...</div>
              )}
            </div>
            <div className="p-3 border-t border-gray-700 flex gap-2">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askAI()}
                placeholder="Ask AI about your code..."
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={askAI}
                disabled={aiLoading}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-sm transition disabled:opacity-50"
              >
                ➤
              </button>
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-700">
              <p className="font-bold text-sm">Room Chat</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i}>
                  {msg.system ? (
                    <p className="text-gray-500 text-xs text-center">{msg.text}</p>
                  ) : (
                    <div className={`${msg.self ? "text-right" : ""}`}>
                      <p className="text-gray-400 text-xs mb-1">{msg.username}</p>
                      <span className={`text-sm px-3 py-1.5 rounded-lg inline-block ${
                        msg.self ? "bg-blue-600" : "bg-gray-700"
                      }`}>
                        {msg.text}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-700 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={sendChat}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm transition"
              >
                ➤
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;