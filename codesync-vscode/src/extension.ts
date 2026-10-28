import * as vscode from "vscode";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import * as path from "path";
import * as fs from "fs";

interface SyncState {
  isConnected: boolean;
  serverUrl: string;
  token: string;
  roomId: string;
  roomName: string;
  socket: Socket | null;
  remoteFiles: Map<string, string>; // path -> fileId
}

let syncState: SyncState = {
  isConnected: false,
  serverUrl: "http://localhost:5000",
  token: "",
  roomId: "",
  roomName: "",
  socket: null,
  remoteFiles: new Map(),
};

let statusBarItem: vscode.StatusBarItem;

// Check if a relative file path matches exclude patterns
function isExcluded(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const excludes = [
    "node_modules",
    ".git",
    ".env",
    "dist",
    "build",
    ".vscode",
    ".DS_Store",
  ];
  return excludes.some((exc) => normalized.includes(exc));
}

export function activate(context: vscode.ExtensionContext) {
  // Create Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "codesync.sync";
  updateStatusBar();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 1. Command: Connect to CodeSync Workspace Room
  const connectCmd = vscode.commands.registerCommand("codesync.connect", async () => {
    const config = vscode.workspace.getConfiguration("codesync");
    const defaultServer = config.get<string>("serverUrl") || "http://localhost:5000";

    const serverUrl = await vscode.window.showInputBox({
      prompt: "Enter CodeSync Server URL",
      value: defaultServer,
    });
    if (!serverUrl) return;

    const token = await vscode.window.showInputBox({
      prompt: "Enter your CodeSync Auth Token (JWT / Bearer Token)",
      password: true,
      placeHolder: "Paste token from browser localStorage (codesync_token)",
    });
    if (!token) return;

    const roomId = await vscode.window.showInputBox({
      prompt: "Enter CodeSync Workspace Room ID",
      placeHolder: "e.g., 3fa85f64-5717-4562-b3fc-2c963f66afa6",
    });
    if (!roomId) return;

    await connectToWorkspace(serverUrl.trim(), token.trim(), roomId.trim());
  });

  // 2. Command: Push / Pull Workspace Sync
  const syncCmd = vscode.commands.registerCommand("codesync.sync", async () => {
    if (!syncState.isConnected) {
      const choice = await vscode.window.showInformationMessage(
        "CodeSync is not connected. Connect now?",
        "Connect"
      );
      if (choice === "Connect") {
        vscode.commands.executeCommand("codesync.connect");
      }
      return;
    }
    await pullRemoteFiles();
    vscode.window.showInformationMessage(`CodeSync: Synchronized with ${syncState.roomName}`);
  });

  // 3. Command: Disconnect from Workspace
  const disconnectCmd = vscode.commands.registerCommand("codesync.disconnect", () => {
    disconnectWorkspace();
    vscode.window.showInformationMessage("CodeSync: Disconnected from workspace room.");
  });

  // 4. Command: AI Code Review with Gemini
  const aiReviewCmd = vscode.commands.registerCommand("codesync.aiReview", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("Open a file first to run Gemini AI Code Review.");
      return;
    }

    if (!syncState.token) {
      vscode.window.showErrorMessage("Please connect to CodeSync to authenticate AI requests.");
      return;
    }

    const document = editor.document;
    const code = document.getText();
    const language = document.languageId;
    const filename = path.basename(document.fileName);

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "CodeSync AI: Gemini Flash is reviewing your code...",
        cancellable: false,
      },
      async () => {
        try {
          const res = await axios.post(
            `${syncState.serverUrl}/api/execute/ai/review`,
            { code, language, filename },
            { headers: { Authorization: `Bearer ${syncState.token}` } }
          );

          // Open review output in a markdown preview panel
          const panel = vscode.window.createWebviewPanel(
            "codesyncReview",
            `AI Review: ${filename}`,
            vscode.ViewColumn.Beside,
            { enableScripts: true }
          );

          const markdownContent = res.data.review.replace(/\n/g, "<br/>");
          panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; line-height: 1.6; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
                pre { background: rgba(128, 128, 128, 0.1); padding: 10px; border-radius: 4px; overflow-x: auto; }
                h1, h2, h3 { color: var(--vscode-textLink-foreground); }
              </style>
            </head>
            <body>
              <h2>🤖 CodeSync AI Code Review (Gemini Flash)</h2>
              <div>${markdownContent}</div>
            </body>
            </html>
          `;
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `AI Review failed: ${err.response?.data?.message || err.message}`
          );
        }
      }
    );
  });

  // 5. Watch Local File Saves and Push to Remote CodeSync
  const onDidSave = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    if (!syncState.isConnected || !syncState.socket) return;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const rootPath = workspaceFolders[0].uri.fsPath;
    const relPath = path.relative(rootPath, doc.fileName).replace(/\\/g, "/");

    if (isExcluded(relPath)) return;

    const code = doc.getText();
    const fileId = syncState.remoteFiles.get(relPath);

    if (fileId) {
      // Emit save-code event over socket
      syncState.socket.emit("save-code", {
        fileId,
        code,
        roomId: syncState.roomId,
      });
    } else {
      // Create new file remotely via REST
      try {
        const res = await axios.post(
          `${syncState.serverUrl}/api/rooms/${syncState.roomId}/files`,
          {
            name: path.basename(relPath),
            path: relPath,
            content: code,
          },
          { headers: { Authorization: `Bearer ${syncState.token}` } }
        );
        syncState.remoteFiles.set(relPath, res.data.file._id);
      } catch (e: any) {
        console.error("Auto-create file failed:", e.message);
      }
    }
  });

  context.subscriptions.push(connectCmd, syncCmd, disconnectCmd, aiReviewCmd, onDidSave);
}

// Connect to Remote CodeSync Workspace
async function connectToWorkspace(serverUrl: string, token: string, roomId: string) {
  try {
    // 1. Fetch Room Metadata & Files
    const res = await axios.get(`${serverUrl}/api/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const room = res.data.room;
    const files = res.data.files || [];

    // 2. Connect Socket.IO
    const socket = io(serverUrl, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.emit("join-room", {
      roomId,
      username: "VS Code Extension",
    });

    // Handle remote file updates
    socket.on("code-update", async ({ fileId, code }: { fileId: string; code: string }) => {
      await updateLocalFile(fileId, code);
    });

    socket.on("file-synced", async ({ fileId, code }: { fileId: string; code: string }) => {
      await updateLocalFile(fileId, code);
    });

    syncState = {
      isConnected: true,
      serverUrl,
      token,
      roomId,
      roomName: room.name,
      socket,
      remoteFiles: new Map(),
    };

    // Cache remote file IDs
    files.forEach((f: any) => {
      if (!f.isFolder) {
        syncState.remoteFiles.set(f.path, f._id);
      }
    });

    updateStatusBar();
    vscode.window.showInformationMessage(
      `CodeSync: Connected to workspace "${room.name}" (${files.length} files)`
    );

    // Initial pull of files into local workspace
    await pullRemoteFiles(files);
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to connect to CodeSync: ${err.response?.data?.message || err.message}`
    );
  }
}

// Download Remote Files into Local VS Code Workspace
async function pullRemoteFiles(filesList?: any[]) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const rootPath = workspaceFolders[0].uri.fsPath;

  try {
    let files = filesList;
    if (!files) {
      const res = await axios.get(`${syncState.serverUrl}/api/rooms/${syncState.roomId}`, {
        headers: { Authorization: `Bearer ${syncState.token}` },
      });
      files = res.data.files || [];
    }

    for (const f of files) {
      if (isExcluded(f.path)) continue;
      const localFilePath = path.join(rootPath, f.path);

      if (f.isFolder) {
        if (!fs.existsSync(localFilePath)) {
          fs.mkdirSync(localFilePath, { recursive: true });
        }
      } else {
        const dir = path.dirname(localFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        // Write file content if changed or new
        fs.writeFileSync(localFilePath, f.content || "", "utf8");
        syncState.remoteFiles.set(f.path, f._id);
      }
    }
  } catch (err: any) {
    console.error("Pull files error:", err.message);
  }
}

// Update Local File when Remote Change Arrives
async function updateLocalFile(fileId: string, content: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const rootPath = workspaceFolders[0].uri.fsPath;

  // Find relative path by fileId
  for (const [relPath, id] of syncState.remoteFiles.entries()) {
    if (id === fileId) {
      const localFilePath = path.join(rootPath, relPath);
      try {
        fs.writeFileSync(localFilePath, content, "utf8");
      } catch (err: any) {
        console.error("Failed to write remote update to local file:", err.message);
      }
      break;
    }
  }
}

function disconnectWorkspace() {
  if (syncState.socket) {
    syncState.socket.disconnect();
  }
  syncState = {
    isConnected: false,
    serverUrl: "http://localhost:5000",
    token: "",
    roomId: "",
    roomName: "",
    socket: null,
    remoteFiles: new Map(),
  };
  updateStatusBar();
}

function updateStatusBar() {
  if (syncState.isConnected) {
    statusBarItem.text = `$(sync~spin) CodeSync: ${syncState.roomName}`;
    statusBarItem.tooltip = `Connected to Room ${syncState.roomId}. Click to re-sync.`;
    statusBarItem.color = "#4ade80"; // Green
  } else {
    statusBarItem.text = `$(plug) CodeSync: Disconnected`;
    statusBarItem.tooltip = `Click to connect to a CodeSync collaborative room.`;
    statusBarItem.color = "#94a3b8"; // Gray
  }
}

export function deactivate() {
  disconnectWorkspace();
}
