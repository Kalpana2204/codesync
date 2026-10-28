import React, { useRef, useState } from "react";
import Editor from "@monaco-editor/react";

const getFileIcon = (fileName) => {
  if (!fileName) return "📄";
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "JS";
    case "ts":
    case "tsx":
      return "TS";
    case "py":
      return "PY";
    case "java":
      return "☕";
    case "cpp":
    case "c":
      return "C++";
    case "html":
      return "🌐";
    case "css":
      return "🎨";
    case "json":
      return "{}";
    case "md":
      return "📝";
    default:
      return "📄";
  }
};

const CodeEditor = ({
  activeFile,
  code,
  language,
  openFiles = [],
  onSelectTab,
  onCloseTab,
  onChangeCode,
  onSave,
  isSaved,
  onCursorChange,
  collaborators = [],
}) => {
  const editorRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Handle Monaco editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Listen to cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column,
      });

      if (onCursorChange) {
        onCursorChange({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Keyboard shortcut: Ctrl+S / Cmd+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });
  };

  // Find users currently working in this active file
  const activeCollaborators = collaborators.filter(
    ([id, user]) => user.activeFileId === activeFile?._id
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c] overflow-x-auto select-none no-scrollbar">
        {openFiles.map((file) => {
          const isActive = file._id === activeFile?._id;
          return (
            <div
              key={file._id}
              onClick={() => onSelectTab(file)}
              className={`group flex items-center gap-2 px-3 py-2 text-xs border-r border-[#3c3c3c] cursor-pointer transition shrink-0 max-w-[200px] ${
                isActive
                  ? "bg-[#1e1e1e] text-white border-t-2 border-t-blue-500 font-medium"
                  : "bg-[#2d2d2d] text-gray-400 hover:bg-[#282828] hover:text-gray-200"
              }`}
            >
              <span className="text-[11px] font-mono text-blue-400">
                {getFileIcon(file.name)}
              </span>
              <span className="truncate">{file.name}</span>

              {/* Unsaved Dot Indicator */}
              {isActive && !isSaved && (
                <span
                  title="Unsaved changes"
                  className="w-2 h-2 rounded-full bg-yellow-400 shrink-0"
                />
              )}

              {/* Close Tab Button */}
              {openFiles.length > 1 && (
                <button
                  title="Close tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file._id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded p-0.5 text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Collaborator Presence Bar for Current File */}
      {activeCollaborators.length > 0 && (
        <div className="bg-blue-950/40 border-b border-blue-900/60 px-3 py-1 flex items-center gap-2 text-xs text-blue-300">
          <span>👥 Viewing this file:</span>
          <div className="flex items-center gap-1.5">
            {activeCollaborators.map(([id, u]) => (
              <span
                key={id}
                className="bg-blue-600/40 border border-blue-500/40 text-blue-200 px-1.5 py-0.5 rounded text-[11px]"
              >
                ● {u.username}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Monaco Code Editor */}
      <div className="flex-1 relative overflow-hidden">
        {activeFile ? (
          <Editor
            height="100%"
            theme="vs-dark"
            language={language || "javascript"}
            value={code}
            onChange={(val) => onChangeCode(val || "")}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: true, maxColumn: 80 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              formatOnPaste: true,
              formatOnType: true,
              renderWhitespace: "selection",
              cursorBlinking: "smooth",
              smoothScrolling: true,
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <p className="text-4xl mb-3">📄</p>
            <p>No file selected</p>
            <p className="text-xs text-gray-600 mt-1">
              Select or create a file from the explorer on the left.
            </p>
          </div>
        )}
      </div>

      {/* Editor Status Bar */}
      <div className="h-6 bg-[#007acc] text-white px-3 flex items-center justify-between text-[11px] select-none font-mono">
        <div className="flex items-center gap-4">
          <span className="font-semibold">CodeSync IDE</span>
          <span>{activeFile?.path || "untitled"}</span>
          <span className="opacity-80">
            {isSaved ? "✅ Saved" : "● Unsaved"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span className="uppercase font-semibold tracking-wider">
            {language}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
