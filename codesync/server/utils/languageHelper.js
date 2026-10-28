const path = require("path");

const EXTENSION_MAP = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".java": "java",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".c": "c",
  ".h": "cpp",
  ".hpp": "cpp",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".less": "less",
  ".json": "json",
  ".md": "markdown",
  ".sql": "sql",
  ".sh": "shell",
  ".bash": "shell",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".xml": "xml",
  ".rs": "rust",
  ".go": "go",
};

const detectLanguage = (filePath, fallback = "javascript") => {
  if (!filePath) return fallback;
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext] || fallback;
};

module.exports = { detectLanguage };
