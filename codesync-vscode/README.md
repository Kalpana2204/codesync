# CodeSync VS Code Extension

Official Visual Studio Code extension for **CodeSync: AI-Powered Collaborative Coding Platform**.

## Features

- **Bi-Directional Synchronization:** Connect your local VS Code workspace directly to a live CodeSync collaborative room.
- **Auto-Sync on Save:** Edits saved locally in VS Code automatically propagate to room collaborators in real-time.
- **Remote Edit Propagation:** Edits made by teammates in the CodeSync browser IDE or other local VS Code clients update your local files automatically.
- **Safe Selective Sync:** Automatically ignores `.git`, `node_modules`, `.env`, build artifacts, and sensitive files.
- **AI-Powered Code Review:** Execute Google Gemini Flash code reviews on the active document with a single command.

---

## Commands

| Command | Title | Description |
|---|---|---|
| `codesync.connect` | **CodeSync: Connect to Workspace Room** | Prompts for Server URL, Auth Token, and Room ID to initiate sync. |
| `codesync.sync` | **CodeSync: Push/Pull Workspace Sync** | Manually synchronizes files between local and remote workspace. |
| `codesync.disconnect` | **CodeSync: Disconnect from Workspace** | Disconnects the socket session and stops synchronization. |
| `codesync.aiReview` | **CodeSync: AI Review Current File (Gemini)** | Sends active file to Gemini for bugs, security, and performance review. |

---

## Setup & Development

1. Open this directory in VS Code or terminal:
   ```bash
   cd codesync-vscode
   npm install
   npm run compile
   ```
2. Press `F5` in VS Code to launch the **Extension Development Host**.
3. In the new window, open any project folder and press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac).
4. Run `CodeSync: Connect to Workspace Room`.
5. Enter your CodeSync Server URL (e.g. `http://localhost:5000`), your JWT Auth Token (from `localStorage.getItem("codesync_token")`), and your Room ID.
