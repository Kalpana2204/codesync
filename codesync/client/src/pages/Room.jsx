import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import useWebRTC from "../hooks/useWebRTC";
import VideoChat from "../components/VideoChat";
import FileTree from "../components/FileTree/FileTree";
import CodeEditor from "../components/Editor/CodeEditor";
import AIPanel from "../components/AIPanel/AIPanel";
import Chat from "../components/Chat/Chat";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

const Room = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Room & File State
  const [room, setRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]); // List of opened tab files
  const [activeFile, setActiveFile] = useState(null);
  const [code, setCode] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [language, setLanguage] = useState("javascript");

  // Users & Presence State
  const [users, setUsers] = useState([]);

  // Execution Console State
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showConsole, setShowConsole] = useState(true);

  // Side Drawers
  const [activeDrawer, setActiveDrawer] = useState(null); // 'ai' | 'chat' | 'video' | null

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);

  // Refs
  const socketRef = useRef(null);
  const codeRef = useRef(code);
  const activeFileRef = useRef(activeFile);

  // Sync refs with state
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // WebRTC hook
  const { localStream, peers, micOn, camOn, toggleMic, toggleCam } = useWebRTC(
    socketRef,
    roomId,
    activeDrawer === "video"
  );

  // 1. Fetch Room and Files Baseline
  const fetchRoomData = useCallback(async () => {
    try {
      const res = await API.get(`/rooms/${roomId}`);
      setRoom(res.data.room);
      const roomFiles = res.data.files || [];
      setFiles(roomFiles);

      // Select first non-folder file if no active file
      const nonFolders = roomFiles.filter((f) => !f.isFolder);
      if (nonFolders.length > 0 && !activeFileRef.current) {
        const firstFile = nonFolders[0];
        setActiveFile(firstFile);
        setCode(firstFile.content || "");
        setLanguage(firstFile.language || "javascript");
        setOpenFiles([firstFile]);
      }
    } catch (err) {
      console.error("Failed to load room:", err);
      navigate("/dashboard");
    }
  }, [roomId, navigate]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // 2. Setup Socket.IO Connection
  useEffect(() => {
    const token = localStorage.getItem("codesync_token");
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      auth: { token },
    });

    const socket = socketRef.current;

    socket.emit("join-room", {
      roomId,
      username: user?.username || "Guest",
    });

    // Room members update
    socket.on("room-users", ({ users }) => {
      setUsers(users);
    });

    socket.on("user-joined", ({ username, users }) => {
      setUsers(users);
      setChatMessages((prev) => [
        ...prev,
        { system: true, text: `${username} joined the workspace` },
      ]);
    });

    socket.on("user-left", ({ username, users }) => {
      setUsers(users);
      setChatMessages((prev) => [
        ...prev,
        { system: true, text: `${username} left the workspace` },
      ]);
    });

    // Real-time code change in active file
    socket.on("code-update", ({ fileId, code: remoteCode }) => {
      if (activeFileRef.current && activeFileRef.current._id === fileId) {
        setCode(remoteCode);
        codeRef.current = remoteCode;
      }
      // Update in file list cache
      setFiles((prev) =>
        prev.map((f) => (f._id === fileId ? { ...f, content: remoteCode } : f))
      );
    });

    // File saved confirmation
    socket.on("code-saved", ({ fileId }) => {
      if (activeFileRef.current?._id === fileId) {
        setIsSaved(true);
      }
    });

    // File synchronized from another user
    socket.on("file-synced", ({ fileId, code: syncedCode }) => {
      setFiles((prev) =>
        prev.map((f) => (f._id === fileId ? { ...f, content: syncedCode } : f))
      );
    });

    // File created in room by another user
    socket.on("file-created", ({ file }) => {
      setFiles((prev) => {
        if (prev.some((f) => f._id === file._id || f.path === file.path)) return prev;
        return [...prev, file];
      });
    });

    // File deleted in room
    socket.on("file-deleted", ({ fileId }) => {
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      setOpenFiles((prev) => prev.filter((f) => f._id !== fileId));
      if (activeFileRef.current?._id === fileId) {
        const remaining = files.filter((f) => f._id !== fileId && !f.isFolder);
        if (remaining.length > 0) {
          handleSelectFile(remaining[0]);
        } else {
          setActiveFile(null);
          setCode("");
        }
      }
    });

    // File renamed in room
    socket.on("file-renamed", ({ file, allFiles }) => {
      if (allFiles) {
        setFiles(allFiles);
      } else {
        setFiles((prev) => prev.map((f) => (f._id === file._id ? file : f)));
      }
      if (activeFileRef.current?._id === file._id) {
        setActiveFile(file);
      }
    });

    // Project refreshed (e.g. ZIP imported)
    socket.on("project-refreshed", ({ files: newFiles }) => {
      setFiles(newFiles);
      if (newFiles.length > 0) {
        handleSelectFile(newFiles[0]);
      }
    });

    // Chat messages
    socket.on("chat-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // Broadcasted run output
    socket.on("run-output", ({ output: remoteOutput, username }) => {
      setOutput(`${remoteOutput}\n\n▶ Ran by ${username}`);
      setShowConsole(true);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user?.username]);

  // 3. Tab & File Switching
  const handleSelectFile = (file) => {
    if (file.isFolder) return;

    // Save previous file if unsaved
    if (!isSaved && activeFile) {
      handleSaveCode();
    }

    setActiveFile(file);
    setCode(file.content || "");
    setLanguage(file.language || "javascript");
    setIsSaved(true);

    // Add to open tabs if not already open
    setOpenFiles((prev) => {
      if (!prev.some((f) => f._id === file._id)) {
        return [...prev, file];
      }
      return prev;
    });

    // Notify room of active file change
    if (socketRef.current) {
      socketRef.current.emit("active-file-change", {
        roomId,
        fileId: file._id,
        username: user?.username,
      });
    }
  };

  const handleCloseTab = (fileIdToClose) => {
    const nextTabs = openFiles.filter((f) => f._id !== fileIdToClose);
    setOpenFiles(nextTabs);

    if (activeFile?._id === fileIdToClose) {
      if (nextTabs.length > 0) {
        handleSelectFile(nextTabs[nextTabs.length - 1]);
      } else {
        setActiveFile(null);
        setCode("");
      }
    }
  };

  // 4. Code Change & Autosave / Manual Save
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setIsSaved(false);

    // Update in files state cache
    if (activeFile) {
      setFiles((prev) =>
        prev.map((f) => (f._id === activeFile._id ? { ...f, content: newCode } : f))
      );
    }

    // Broadcast delta over socket
    if (socketRef.current && activeFile) {
      socketRef.current.emit("code-change", {
        roomId,
        fileId: activeFile._id,
        code: newCode,
      });
    }
  };

  const handleSaveCode = () => {
    if (!activeFile) return;
    if (socketRef.current) {
      socketRef.current.emit("save-code", {
        fileId: activeFile._id,
        code: codeRef.current,
        roomId,
      });
    }
    setIsSaved(true);
  };

  // 5. Cursor Tracking
  const handleCursorChange = (cursor) => {
    if (socketRef.current && activeFile) {
      socketRef.current.emit("cursor-change", {
        roomId,
        fileId: activeFile._id,
        cursor,
        username: user?.username,
      });
    }
  };

  // 6. File Explorer Operations
  const handleCreateFile = async ({ name, path: filePath, isFolder }) => {
    try {
      const res = await API.post(`/rooms/${roomId}/files`, {
        name,
        path: filePath,
        isFolder,
      });
      const newFile = res.data.file;
      setFiles((prev) => [...prev, newFile]);

      if (!isFolder) {
        handleSelectFile(newFile);
      }

      if (socketRef.current) {
        socketRef.current.emit("file-created", { roomId, file: newFile });
      }
    } catch (err) {
      alert(`Create failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleRenameFile = async (fileId, newName) => {
    try {
      const res = await API.patch(`/rooms/${roomId}/files/${fileId}/rename`, {
        newName,
      });
      setFiles(res.data.allFiles);
      if (activeFile?._id === fileId) {
        setActiveFile(res.data.file);
      }
      if (socketRef.current) {
        socketRef.current.emit("file-renamed", {
          roomId,
          file: res.data.file,
          allFiles: res.data.allFiles,
        });
      }
    } catch (err) {
      alert(`Rename failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      const res = await API.delete(`/rooms/${roomId}/files/${fileId}`);
      setFiles(res.data.remainingFiles);
      setOpenFiles((prev) => prev.filter((f) => f._id !== fileId));

      if (activeFile?._id === fileId) {
        const remaining = res.data.remainingFiles.filter((f) => !f.isFolder);
        if (remaining.length > 0) {
          handleSelectFile(remaining[0]);
        } else {
          setActiveFile(null);
          setCode("");
        }
      }

      if (socketRef.current) {
        socketRef.current.emit("file-deleted", { roomId, fileId });
      }
    } catch (err) {
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // 7. Project ZIP Export & Import
  const handleExportZip = async () => {
    try {
      const response = await API.get(`/rooms/${roomId}/export-zip`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${room?.name || "project"}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export ZIP archive.");
    }
  };

  const handleImportZip = async (file) => {
    const formData = new FormData();
    formData.append("zipFile", file);

    try {
      const res = await API.post(`/rooms/${roomId}/import-zip`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles(res.data.files);

      const nonFolders = res.data.files.filter((f) => !f.isFolder);
      if (nonFolders.length > 0) {
        handleSelectFile(nonFolders[0]);
      }

      if (socketRef.current) {
        socketRef.current.emit("project-refreshed", {
          roomId,
          files: res.data.files,
        });
      }
    } catch (err) {
      alert(`ZIP import failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // 8. Run Code with Project-Aware Sandbox
  const handleRunCode = async () => {
    setIsRunning(true);
    setShowConsole(true);
    setOutput("⏳ Bundling project files & executing in sandbox...\n");

    try {
      const res = await API.post("/execute/run", {
        code: codeRef.current,
        language,
        filename: activeFile?.path,
        projectFiles: files,
      });

      const formatted = `=== Execution Status: ${res.data.status} ===\n\n${res.data.output}`;
      setOutput(formatted);

      if (socketRef.current) {
        socketRef.current.emit("run-output", {
          roomId,
          output: formatted,
          username: user?.username,
        });
      }
    } catch (err) {
      setOutput(`❌ Execution Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 9. AI 1-Click Code Fix Application
  const handleApplyCodeFix = (fixedCode) => {
    if (!activeFile) return;
    setCode(fixedCode);
    codeRef.current = fixedCode;
    setIsSaved(false);

    if (socketRef.current) {
      socketRef.current.emit("code-change", {
        roomId,
        fileId: activeFile._id,
        code: fixedCode,
      });
    }
  };

  // 10. Send Chat Message
  const handleSendChatMessage = (text) => {
    if (socketRef.current) {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      socketRef.current.emit("send-chat", {
        roomId,
        username: user?.username,
        text,
      });
      setChatMessages((prev) => [
        ...prev,
        { username: user?.username, text, timestamp },
      ]);
    }
  };

  // 11. Copy Room Invite
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert("Workspace ID copied to clipboard! Share it with your team.");
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading CodeSync Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between shrink-0 select-none">
        {/* Left: Project Branding & Name */}
        <div className="flex items-center gap-3">
          <h1
            onClick={() => navigate("/dashboard")}
            className="text-base font-bold cursor-pointer hover:opacity-90 flex items-center gap-1.5"
          >
            <span className="text-blue-500 font-mono text-lg">&lt;/&gt;</span>
            <span>Code<span className="text-blue-500">Sync</span></span>
          </h1>
          <span className="text-gray-600">/</span>
          <span className="text-xs font-semibold text-gray-300">{room.name}</span>
          <span className="bg-blue-900/30 text-blue-400 border border-blue-800/60 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
            {room.language}
          </span>
        </div>

        {/* Right: Actions, Users, Collaboration Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Active Collaborators */}
          <div className="flex items-center gap-1.5 mr-2">
            {users.slice(0, 4).map(([id, u]) => (
              <div
                key={id}
                title={`${u.username} (Connected)`}
                className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold border border-gray-700 shadow"
              >
                {u.username?.[0]?.toUpperCase()}
              </div>
            ))}
            <span className="text-[11px] text-gray-400 font-mono">
              {users.length} online
            </span>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveCode}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded text-xs transition border border-gray-700"
          >
            💾 Save
          </button>

          {/* Share Button */}
          <button
            onClick={copyRoomId}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded text-xs transition border border-gray-700"
          >
            📋 Share
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded text-xs transition disabled:opacity-50 flex items-center gap-1.5 shadow"
          >
            <span>{isRunning ? "⏳" : "▶"}</span>
            <span>Run</span>
          </button>

          {/* Toggle AI Drawer */}
          <button
            onClick={() => setActiveDrawer((p) => (p === "ai" ? null : "ai"))}
            className={`px-3 py-1.5 rounded text-xs transition font-semibold flex items-center gap-1.5 ${
              activeDrawer === "ai"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 hover:bg-gray-700 text-purple-300 border border-purple-800/50"
            }`}
          >
            <span>🤖</span>
            <span>AI Assistant</span>
          </button>

          {/* Toggle Chat Drawer */}
          <button
            onClick={() => setActiveDrawer((p) => (p === "chat" ? null : "chat"))}
            className={`px-3 py-1.5 rounded text-xs transition font-semibold flex items-center gap-1.5 ${
              activeDrawer === "chat"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 hover:bg-gray-700 text-blue-300 border border-gray-700"
            }`}
          >
            <span>💬</span>
            <span>Chat</span>
          </button>

          {/* Toggle Video Call */}
          <button
            onClick={() => setActiveDrawer((p) => (p === "video" ? null : "video"))}
            className={`px-3 py-1.5 rounded text-xs transition font-semibold flex items-center gap-1.5 ${
              activeDrawer === "video"
                ? "bg-rose-600 text-white"
                : "bg-gray-800 hover:bg-gray-700 text-rose-300 border border-gray-700"
            }`}
          >
            <span>📹</span>
            <span>Video</span>
          </button>

          {/* Leave Button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-red-700/80 hover:bg-red-600 text-white px-2.5 py-1.5 rounded text-xs font-semibold transition"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Multi-File Explorer */}
        <aside className="w-56 shrink-0 border-r border-gray-800 overflow-hidden">
          <FileTree
            files={files}
            activeFile={activeFile}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            onExportZip={handleExportZip}
            onImportZip={handleImportZip}
          />
        </aside>

        {/* Center: Editor + Execution Console */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Monaco Code Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              activeFile={activeFile}
              code={code}
              language={language}
              openFiles={openFiles}
              onSelectTab={handleSelectFile}
              onCloseTab={handleCloseTab}
              onChangeCode={handleCodeChange}
              onSave={handleSaveCode}
              isSaved={isSaved}
              onCursorChange={handleCursorChange}
              collaborators={users}
            />
          </div>

          {/* Bottom Execution Output Console */}
          {showConsole && (
            <div className="h-44 bg-[#0e1117] border-t border-gray-800 flex flex-col shrink-0">
              <div className="px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex items-center justify-between text-xs select-none">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-400 font-bold">TERMINAL OUTPUT</span>
                  {isRunning && (
                    <span className="text-[10px] text-yellow-400 animate-pulse">
                      ● Executing in Sandbox...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOutput("")}
                    className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowConsole(false)}
                    className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800"
                  >
                    Hide
                  </button>
                </div>
              </div>

              <pre className="flex-1 p-3 font-mono text-xs overflow-auto text-gray-300 leading-relaxed whitespace-pre-wrap select-text">
                {output || "// Output will appear here when you click ▶ Run"}
              </pre>
            </div>
          )}
        </main>

        {/* Right Drawer: AI Panel */}
        {activeDrawer === "ai" && (
          <aside className="w-96 shrink-0 border-l border-gray-800 overflow-hidden">
            <AIPanel
              activeFile={activeFile}
              currentCode={code}
              language={language}
              projectFiles={files}
              onApplyCodeFix={handleApplyCodeFix}
              onClose={() => setActiveDrawer(null)}
            />
          </aside>
        )}

        {/* Right Drawer: Chat */}
        {activeDrawer === "chat" && (
          <aside className="w-80 shrink-0 border-l border-gray-800 overflow-hidden">
            <Chat
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              currentUsername={user?.username}
              onClose={() => setActiveDrawer(null)}
            />
          </aside>
        )}

        {/* Right Drawer: Video Calling */}
        {activeDrawer === "video" && (
          <aside className="w-72 shrink-0 border-l border-gray-800 overflow-hidden">
            <VideoChat
              localStream={localStream}
              peers={peers}
              micOn={micOn}
              camOn={camOn}
              toggleMic={toggleMic}
              toggleCam={toggleCam}
              onEndCall={() => setActiveDrawer(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
};

export default Room;
