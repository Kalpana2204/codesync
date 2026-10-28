const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const aiService = require("../services/aiService");

// Project & Multi-Language Code Execution
const executeCode = async (req, res) => {
  const { code, language, filename, projectFiles } = req.body;

  if (!code && !projectFiles) {
    return res.status(400).json({ message: "Code or project files are required" });
  }

  const tmpRoot = path.join(__dirname, "../tmp");
  if (!fs.existsSync(tmpRoot)) {
    fs.mkdirSync(tmpRoot, { recursive: true });
  }

  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const runDir = path.join(tmpRoot, runId);
  fs.mkdirSync(runDir, { recursive: true });

  let entryFile = "main.js";
  let command = "";
  const lang = (language || "javascript").toLowerCase();

  try {
    // If projectFiles were supplied, write all project files into the sandbox directory
    if (Array.isArray(projectFiles) && projectFiles.length > 0) {
      for (const f of projectFiles) {
        if (!f.path || f.isFolder) continue;
        const targetPath = path.join(runDir, f.path);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, f.content || "", "utf8");
      }
    }

    // Determine entry file
    if (filename) {
      entryFile = filename;
      const targetFile = path.join(runDir, filename);
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, code, "utf8");
    } else {
      if (lang === "javascript") entryFile = "index.js";
      else if (lang === "python") entryFile = "main.py";
      else if (lang === "cpp") entryFile = "main.cpp";
      else if (lang === "java") entryFile = "Main.java";
      else entryFile = "script.txt";

      fs.writeFileSync(path.join(runDir, entryFile), code, "utf8");
    }

    // Configure command based on language
    const entryFullPath = path.join(runDir, entryFile);

    if (lang === "javascript" || lang === "node") {
      command = `node "${entryFullPath}"`;
    } else if (lang === "python") {
      command = `python "${entryFullPath}"`;
    } else if (lang === "cpp" || lang === "c") {
      const outBinary = path.join(runDir, "program.exe");
      command = `g++ "${entryFullPath}" -o "${outBinary}" && "${outBinary}"`;
    } else if (lang === "java") {
      const className = path.basename(entryFile, ".java");
      command = `javac "${entryFullPath}" && java -cp "${runDir}" ${className}`;
    } else {
      return res.status(400).json({
        message: `Language '${language}' execution is not supported in the sandbox.`,
      });
    }

    // Run command in isolated working directory with 8000ms timeout
    exec(
      command,
      {
        cwd: runDir,
        timeout: 8000,
        maxBuffer: 1024 * 512, // 512 KB output max
        env: {
          ...process.env,
          NODE_ENV: "sandbox",
        },
      },
      (error, stdout, stderr) => {
        // Clean up sandbox directory
        try {
          fs.rmSync(runDir, { recursive: true, force: true });
        } catch (cleanupErr) {
          console.warn("Sandbox cleanup notice:", cleanupErr.message);
        }

        if (error && error.killed) {
          return res.status(200).json({
            output: "⏱️ Execution Timed Out (exceeded 8-second limit).",
            status: "Timeout",
          });
        }

        let output = "";
        if (stdout) output += stdout;
        if (stderr) output += (output ? "\n" : "") + stderr;

        if (!output) output = "Program completed with no output.";

        res.status(200).json({
          output,
          status: stderr || error ? "Error" : "Success",
        });
      }
    );
  } catch (err) {
    try {
      fs.rmSync(runDir, { recursive: true, force: true });
    } catch {}
    res.status(500).json({ message: "Execution failed", error: err.message });
  }
};

// AI Chat Controller
const askAI = async (req, res) => {
  const { message, code, language, filename, projectFiles } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    const reply = await aiService.chatWithAssistant({
      message,
      code,
      language,
      filename,
      projectFiles,
    });
    res.status(200).json({ reply });
  } catch (error) {
    console.error("AI error:", error.message);
    res.status(500).json({ message: "AI failed", error: error.message });
  }
};

// AI Code Review Controller
const reviewCode = async (req, res) => {
  const { code, language, filename, projectFiles } = req.body;

  if (!code && !projectFiles) {
    return res.status(400).json({ message: "Code is required for review" });
  }

  try {
    const review = await aiService.reviewCode({
      code,
      language,
      filename,
      projectFiles,
    });
    res.status(200).json({ review });
  } catch (error) {
    console.error("AI review error:", error.message);
    res.status(500).json({ message: "Code review failed", error: error.message });
  }
};

// AI Explain Code Controller
const explainCode = async (req, res) => {
  const { code, language, filename } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Code is required to explain" });
  }

  try {
    const explanation = await aiService.explainCode({ code, language, filename });
    res.status(200).json({ explanation });
  } catch (error) {
    console.error("AI explanation error:", error.message);
    res.status(500).json({ message: "Code explanation failed", error: error.message });
  }
};

// AI Fix Suggestion Controller
const suggestFix = async (req, res) => {
  const { code, language, issueDescription, filename } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Code is required for fix suggestion" });
  }

  try {
    const result = await aiService.suggestFix({
      code,
      language,
      issueDescription,
      filename,
    });
    res.status(200).json(result);
  } catch (error) {
    console.error("AI fix error:", error.message);
    res.status(500).json({ message: "Fix suggestion failed", error: error.message });
  }
};

module.exports = {
  executeCode,
  askAI,
  reviewCode,
  explainCode,
  suggestFix,
};
