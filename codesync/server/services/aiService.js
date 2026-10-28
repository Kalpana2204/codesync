const { GoogleGenerativeAI } = require("@google/generative-ai");

const getGeminiModel = (modelName = "gemini-1.5-flash") => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    throw new Error("GEMINI_API_KEY is not configured in server environment.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

// Format project context for the AI prompt (RAG-lite multi-file retrieval)
const formatProjectContext = (projectFiles = [], activePath = "") => {
  if (!Array.isArray(projectFiles) || projectFiles.length === 0) return "";

  const contextItems = projectFiles
    .filter((f) => !f.isFolder && f.path !== activePath)
    .slice(0, 10) // Limit to top 10 relevant files to conserve context tokens
    .map((f) => {
      const truncated = (f.content || "").slice(0, 1500);
      return `File: ${f.path}\n\`\`\`${f.language || "text"}\n${truncated}\n\`\`\``;
    });

  if (contextItems.length === 0) return "";
  return `\n--- Additional Project Context Files ---\n${contextItems.join("\n\n")}\n--- End Project Context ---\n`;
};

// 1. General Chat / Assistant with Project Context
const chatWithAssistant = async ({ message, code, language, filename, projectFiles }) => {
  const projectContext = formatProjectContext(projectFiles, filename);
  const prompt = `You are CodeSync AI, an expert collaborative software engineering assistant integrated directly into the CodeSync browser IDE.

Current Active File: ${filename || "main"} (${language || "javascript"})
Active Code:
\`\`\`${language || "javascript"}
${code || "// Empty file"}
\`\`\`
${projectContext}

User Query:
${message}

Instructions:
- Provide accurate, modern, concise, and helpful advice.
- When suggesting code modifications, provide clean code blocks with appropriate language tags.
- Refer to relevant project files where applicable.
`;

  try {
    const model = getGeminiModel("gemini-1.5-flash");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    // Attempt fallback model if 1.5-flash encounters a quota or model naming difference
    try {
      const fallbackModel = getGeminiModel("gemini-1.5-pro");
      const result = await fallbackModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (fallbackErr) {
      console.error("Gemini API error:", fallbackErr.message);
      throw new Error(`Gemini AI service error: ${fallbackErr.message}`);
    }
  }
};

// 2. Comprehensive Automated Code Review
const reviewCode = async ({ code, language, filename, projectFiles }) => {
  const projectContext = formatProjectContext(projectFiles, filename);
  const prompt = `You are a senior software architect and code reviewer. Conduct a rigorous, comprehensive review of the following code.

File: ${filename || "source"} (${language || "javascript"})
\`\`\`${language || "javascript"}
${code || "// No code provided"}
\`\`\`
${projectContext}

Please structure your review using the following markdown sections:
### 1. Executive Summary
Brief high-level assessment of code quality and design.

### 2. Potential Bugs & Logic Issues
Identify any syntax issues, edge cases, off-by-one errors, unhandled rejections, or memory leaks.

### 3. Security Analysis
Check for injection vulnerabilities, exposed secrets, insecure deserialization, unsafe APIs, or improper input validation.

### 4. Performance & Efficiency
Identify asymptotic complexity bottlenecks, redundant operations, or unnecessary allocations.

### 5. Recommended Refactoring
Concrete improvement steps with clear before/after examples.
`;

  const model = getGeminiModel("gemini-1.5-flash");
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

// 3. Code Explanation
const explainCode = async ({ code, language, filename }) => {
  const prompt = `You are a patient programming educator. Explain the following ${language || "source"} code clearly and methodically.

File: ${filename || "source"}
\`\`\`${language || "javascript"}
${code || "// No code"}
\`\`\`

Instructions:
1. Provide a one-paragraph overview of what this code does.
2. Break down each key function, class, or block step-by-step.
3. Explain any important algorithms, design patterns, or libraries utilized.
4. Mention expected inputs, outputs, and edge behaviors.
Keep formatting clean and easy to read.`;

  const model = getGeminiModel("gemini-1.5-flash");
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

// 4. Generate Fix / Patch with Direct Replacement
const suggestFix = async ({ code, language, issueDescription, filename }) => {
  const prompt = `You are an automated code repair assistant.
Given the following code and issue description, provide:
1. A concise explanation of the root cause and the fix.
2. The COMPLETE corrected code ready to replace the current file.

File: ${filename || "source"} (${language || "javascript"})
Issue / Error:
${issueDescription || "Fix all bugs, errors, and optimize the code."}

Original Code:
\`\`\`${language || "javascript"}
${code || ""}
\`\`\`

IMPORTANT: You must format your final corrected code inside a single markdown code block starting with:
\`\`\`${language || "javascript"}
<COMPLETE_FIXED_CODE_HERE>
\`\`\`
Do not abbreviate code with comments like "// rest of code remains the same"; output the entire runnable file.`;

  const model = getGeminiModel("gemini-1.5-flash");
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const replyText = response.text();

  // Extract the code block from the response
  const codeBlockMatch = replyText.match(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/);
  const fixedCode = codeBlockMatch ? codeBlockMatch[1].trim() : code;

  return {
    explanation: replyText,
    fixedCode,
  };
};

module.exports = {
  chatWithAssistant,
  reviewCode,
  explainCode,
  suggestFix,
};
