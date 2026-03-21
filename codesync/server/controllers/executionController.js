const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const executeCode = async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ message: "Code and language are required" });
  }

  const tmpDir = path.join(__dirname, "../tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const timestamp = Date.now();
  let filename, command;

  try {
    if (language === "javascript") {
      filename = path.join(tmpDir, `code_${timestamp}.js`);
      fs.writeFileSync(filename, code);
      command = `node "${filename}"`;
    } else if (language === "python") {
      filename = path.join(tmpDir, `code_${timestamp}.py`);
      fs.writeFileSync(filename, code);
      command = `python "${filename}"`;
    } else {
      return res.status(400).json({ message: "Only JavaScript and Python supported for now" });
    }

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      if (fs.existsSync(filename)) fs.unlinkSync(filename);

      if (error && !stdout && !stderr) {
        return res.status(200).json({
          output: `❌ Error: ${error.message}`,
          status: "Error",
        });
      }

      let output = "";
      if (stdout) output += stdout;
      if (stderr) output += `\nError: ${stderr}`;
      if (!output) output = "No output";

      res.status(200).json({
        output,
        status: stderr ? "Error" : "Accepted",
      });
    });
  } catch (error) {
    if (filename && fs.existsSync(filename)) fs.unlinkSync(filename);
    res.status(500).json({ message: "Execution failed", error: error.message });
  }
};

const askAI = async (req, res) => {
  const { message, code, language } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    const Groq = require("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert coding assistant inside a collaborative IDE called CodeSync.
The user is working with ${language} code.
Here is their current code:
\`\`\`${language}
${code || "// No code yet"}
\`\`\`
Be concise and practical. Format code examples clearly.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 500,
    });

    const reply = response.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("AI error:", error.message);
    res.status(500).json({ message: "AI failed", error: error.message });
  }
};

module.exports = { executeCode, askAI };