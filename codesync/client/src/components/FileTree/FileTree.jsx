import React, { useState, useMemo } from "react";

// Helper to determine icon & color based on file extension
const getFileIcon = (fileName, isFolder) => {
  if (isFolder) return { icon: "📁", color: "text-yellow-400" };
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return { icon: "JS", color: "text-yellow-300 font-bold text-xs" };
    case "ts":
    case "tsx":
      return { icon: "TS", color: "text-blue-400 font-bold text-xs" };
    case "py":
      return { icon: "PY", color: "text-emerald-400 font-bold text-xs" };
    case "java":
      return { icon: "☕", color: "text-orange-400 text-xs" };
    case "cpp":
    case "c":
    case "h":
      return { icon: "C++", color: "text-cyan-400 font-bold text-xs" };
    case "html":
      return { icon: "🌐", color: "text-orange-500 text-xs" };
    case "css":
    case "scss":
      return { icon: "🎨", color: "text-pink-400 text-xs" };
    case "json":
      return { icon: "{}", color: "text-green-400 font-mono text-xs" };
    case "md":
      return { icon: "📝", color: "text-purple-300 text-xs" };
    default:
      return { icon: "📄", color: "text-gray-400 text-xs" };
  }
};

const FileTree = ({
  files = [],
  activeFile,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onExportZip,
  onImportZip,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [creatingType, setCreatingType] = useState(null); // 'file' | 'folder' | null
  const [targetParentPath, setTargetParentPath] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Toggle folder open/collapsed
  const toggleFolder = (path) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Build hierarchical folder tree from flat list of files
  const treeData = useMemo(() => {
    const root = { name: "root", path: "", isFolder: true, children: {} };

    // Filter by search term if provided
    const visibleFiles = searchTerm
      ? files.filter((f) => f.path.toLowerCase().includes(searchTerm.toLowerCase()))
      : files;

    visibleFiles.forEach((file) => {
      const parts = file.path.split("/");
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join("/");

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            isFolder: !isLeaf || file.isFolder,
            file: isLeaf ? file : null,
            children: {},
          };
        } else if (isLeaf) {
          current.children[part].file = file;
          current.children[part].isFolder = file.isFolder;
        }

        current = current.children[part];
      }
    });

    const toSortedArray = (node) => {
      const entries = Object.values(node.children);
      entries.sort((a, b) => {
        if (a.isFolder === b.isFolder) {
          return a.name.localeCompare(b.name);
        }
        return a.isFolder ? -1 : 1; // Folders first
      });
      return entries.map((child) => ({
        ...child,
        items: toSortedArray(child),
      }));
    };

    return toSortedArray(root);
  }, [files, searchTerm]);

  // Handle new item submission
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const fullPath = targetParentPath
      ? `${targetParentPath}/${newItemName.trim()}`
      : newItemName.trim();

    onCreateFile({
      name: newItemName.trim(),
      path: fullPath,
      isFolder: creatingType === "folder",
      content: "",
    });

    setCreatingType(null);
    setNewItemName("");
    setTargetParentPath("");
  };

  // Handle rename submit
  const handleRenameSubmit = (fileId, e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    onRenameFile(fileId, renameValue.trim());
    setRenamingId(null);
    setRenameValue("");
  };

  // Trigger file upload for ZIP
  const handleFileInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onImportZip(file);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Recursive tree node renderer
  const renderNode = (node, depth = 0) => {
    const isFolder = node.isFolder;
    const isCollapsed = collapsedFolders[node.path];
    const isCurrentActive = node.file && activeFile?._id === node.file._id;
    const isRenamingThis = node.file && renamingId === node.file._id;
    const iconMeta = getFileIcon(node.name, isFolder);

    return (
      <div key={node.path} className="select-none">
        <div
          className={`group flex items-center justify-between px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
            isCurrentActive
              ? "bg-blue-600/30 text-blue-300 font-medium"
              : "text-gray-300 hover:bg-gray-800/80"
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 14 + 6)}px` }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else if (node.file) {
              onSelectFile(node.file);
            }
          }}
        >
          {/* Left item details */}
          <div className="flex items-center gap-1.5 truncate flex-1 mr-1">
            {isFolder && (
              <span className="text-[10px] text-gray-500 w-3 text-center">
                {isCollapsed ? "▶" : "▼"}
              </span>
            )}
            <span className={`w-4 text-center shrink-0 ${iconMeta.color}`}>
              {isFolder ? (isCollapsed ? "📁" : "📂") : iconMeta.icon}
            </span>

            {isRenamingThis ? (
              <form
                onSubmit={(e) => handleRenameSubmit(node.file._id, e)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1"
              >
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => setRenamingId(null)}
                  className="bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded outline-none border border-blue-500 w-full"
                />
              </form>
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>

          {/* Quick actions on hover */}
          {!isRenamingThis && (
            <div className="hidden group-hover:flex items-center gap-1 shrink-0">
              {isFolder && (
                <>
                  <button
                    title="New File in Folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetParentPath(node.path);
                      setCreatingType("file");
                      setCollapsedFolders((p) => ({ ...p, [node.path]: false }));
                    }}
                    className="p-0.5 hover:text-blue-400 text-gray-400 text-[10px]"
                  >
                    +📄
                  </button>
                  <button
                    title="New Subfolder"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetParentPath(node.path);
                      setCreatingType("folder");
                      setCollapsedFolders((p) => ({ ...p, [node.path]: false }));
                    }}
                    className="p-0.5 hover:text-yellow-400 text-gray-400 text-[10px]"
                  >
                    +📁
                  </button>
                </>
              )}
              {node.file && (
                <>
                  <button
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(node.file._id);
                      setRenameValue(node.name);
                    }}
                    className="p-0.5 hover:text-white text-gray-400 text-[10px]"
                  >
                    ✏️
                  </button>
                  <button
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete ${isFolder ? "folder and all its contents" : "file"} "${node.name}"?`
                        )
                      ) {
                        onDeleteFile(node.file._id);
                      }
                    }}
                    className="p-0.5 hover:text-red-400 text-gray-400 text-[10px]"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Render Children if Folder is Expanded */}
        {isFolder && !isCollapsed && (
          <div>
            {/* Inline creation input for this folder */}
            {creatingType && targetParentPath === node.path && (
              <form
                onSubmit={handleCreateSubmit}
                className="flex items-center gap-1 my-1"
                style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
              >
                <span className="text-xs">
                  {creatingType === "folder" ? "📁" : "📄"}
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder={creatingType === "folder" ? "folder-name" : "file.ext"}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={() => setCreatingType(null)}
                  className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded outline-none border border-blue-500 w-36"
                />
              </form>
            )}

            {node.items.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800 select-none">
      {/* Explorer Header */}
      <div className="p-2.5 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Explorer
        </span>
        <div className="flex items-center gap-1.5">
          <button
            title="New File at Root"
            onClick={() => {
              setTargetParentPath("");
              setCreatingType("file");
            }}
            className="p-1 rounded hover:bg-gray-800 text-gray-300 hover:text-blue-400 text-xs transition"
          >
            +📄
          </button>
          <button
            title="New Folder at Root"
            onClick={() => {
              setTargetParentPath("");
              setCreatingType("folder");
            }}
            className="p-1 rounded hover:bg-gray-800 text-gray-300 hover:text-yellow-400 text-xs transition"
          >
            +📁
          </button>
          <button
            title="Download Project ZIP"
            onClick={onExportZip}
            className="p-1 rounded hover:bg-gray-800 text-gray-300 hover:text-green-400 text-xs transition"
          >
            ⬇️
          </button>
          <label
            title="Import Project ZIP"
            className="p-1 rounded hover:bg-gray-800 text-gray-300 hover:text-purple-400 text-xs transition cursor-pointer"
          >
            ⬆️
            <input
              type="file"
              accept=".zip"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="px-2 py-1.5 border-b border-gray-800/60">
        <input
          type="text"
          placeholder="Filter files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800/90 text-gray-200 text-xs px-2 py-1 rounded outline-none placeholder-gray-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Root Inline Create Input */}
      {creatingType && targetParentPath === "" && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-gray-800 flex items-center gap-1">
          <span className="text-xs">{creatingType === "folder" ? "📁" : "📄"}</span>
          <input
            type="text"
            autoFocus
            placeholder={creatingType === "folder" ? "folder_name" : "filename.js"}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onBlur={() => setCreatingType(null)}
            className="bg-gray-800 text-white text-xs px-2 py-1 rounded outline-none border border-blue-500 w-full"
          />
        </form>
      )}

      {/* Uploading indicator */}
      {isUploading && (
        <div className="p-2 bg-blue-900/30 text-blue-300 text-xs text-center border-b border-blue-800 animate-pulse">
          ⏳ Extracting & Importing ZIP...
        </div>
      )}

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-1 py-1.5 space-y-0.5">
        {treeData.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-8">
            <p>No files found.</p>
            <button
              onClick={() => {
                setTargetParentPath("");
                setCreatingType("file");
              }}
              className="mt-2 text-blue-400 hover:underline"
            >
              + Create a file
            </button>
          </div>
        ) : (
          treeData.map((node) => renderNode(node, 0))
        )}
      </div>

      {/* Footer stats */}
      <div className="p-2 border-t border-gray-800 text-[10px] text-gray-500 flex justify-between items-center">
        <span>{files.filter((f) => !f.isFolder).length} files</span>
        <span>{files.filter((f) => f.isFolder).length} folders</span>
      </div>
    </div>
  );
};

export default FileTree;
