import React, { useState } from "react";
import API from "../../utils/api";

const AIPanel = ({
  activeFile,
  currentCode,
  language,
  projectFiles = [],
  onApplyCodeFix,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'review' | 'explain' | 'fix'
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Review & Explain state
  const [reviewResult, setReviewResult] = useState("");
  const [explainResult, setExplainResult] = useState("");
  const [fixIssueInput, setFixIssueInput] = useState("");
  const [fixResult, setFixResult] = useState(null); // { explanation, fixedCode }

  // 1. Send Chat Message
  const handleSendChat = async (messageToSend) => {
    const text = messageToSend || chatInput;
    if (!text.trim()) return;

    const userMsg = { role: "user", text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsLoading(true);

    try {
      const res = await API.post("/execute/ai", {
        message: text,
        code: currentCode,
        language,
        filename: activeFile?.path,
        projectFiles,
      });

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.data.reply },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `❌ AI Error: ${err.response?.data?.message || err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Run Comprehensive Code Review
  const handleRunReview = async () => {
    setIsLoading(true);
    setReviewResult("");
    try {
      const res = await API.post("/execute/ai/review", {
        code: currentCode,
        language,
        filename: activeFile?.path,
        projectFiles,
      });
      setReviewResult(res.data.review);
    } catch (err) {
      setReviewResult(`❌ Review failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Run Explain Code
  const handleRunExplain = async () => {
    setIsLoading(true);
    setExplainResult("");
    try {
      const res = await API.post("/execute/ai/explain", {
        code: currentCode,
        language,
        filename: activeFile?.path,
      });
      setExplainResult(res.data.explanation);
    } catch (err) {
      setExplainResult(`❌ Explanation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Request Fix / Patch
  const handleRequestFix = async () => {
    setIsLoading(true);
    setFixResult(null);
    try {
      const res = await API.post("/execute/ai/fix", {
        code: currentCode,
        language,
        issueDescription: fixIssueInput || "Fix all bugs, performance issues, and syntax errors.",
        filename: activeFile?.path,
      });
      setFixResult(res.data);
    } catch (err) {
      setFixResult({
        explanation: `❌ Fix request failed: ${err.response?.data?.message || err.message}`,
        fixedCode: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800 text-gray-200 select-none">
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400">
              CodeSync AI Assistant
            </h2>
            <p className="text-[10px] text-gray-400">Powered by Google Gemini Flash</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-950/60 text-xs">
        {[
          { id: "chat", label: "💬 Chat" },
          { id: "review", label: "🔍 Review" },
          { id: "explain", label: "💡 Explain" },
          { id: "fix", label: "⚡ Fix" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-center transition font-medium border-b-2 ${
              activeTab === tab.id
                ? "border-purple-500 text-purple-300 bg-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Context info bar */}
      <div className="px-3 py-1.5 bg-gray-950 border-b border-gray-800/80 text-[11px] text-gray-400 flex items-center justify-between">
        <span className="truncate">
          📄 File: <strong className="text-gray-300">{activeFile?.name || "none"}</strong>
        </span>
        <span className="bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded text-[10px]">
          {language}
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
        {/* TAB 1: CHAT */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 my-auto py-6">
                <span className="text-3xl block mb-2">✨</span>
                <p className="font-semibold text-gray-400">Ask about your code & project</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Gemini analyzes your active file and multi-file project workspace.
                </p>

                <div className="mt-4 space-y-1.5">
                  {[
                    "Explain what this file does",
                    "How can I refactor this cleanly?",
                    "Check for performance bottlenecks",
                    "Write unit tests for this file",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendChat(prompt)}
                      className="block w-full text-left text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1.5 rounded transition"
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-[10px] text-gray-500 mb-1">
                    {msg.role === "user" ? "You" : "🤖 Gemini Flash"}
                  </span>
                  <div
                    className={`p-2.5 rounded-lg max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-200 border border-gray-700"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-purple-400 text-xs italic">
                <span className="animate-spin">🌀</span> Gemini is thinking...
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REVIEW */}
        {activeTab === "review" && (
          <div className="space-y-3">
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col gap-2">
              <p className="font-semibold text-gray-300">Automated Code Review</p>
              <p className="text-gray-400 text-[11px]">
                Runs a 5-dimension audit: Logic Bugs, Security Vulnerabilities, Performance
                Bottlenecks, and Recommended Refactoring.
              </p>
              <button
                onClick={handleRunReview}
                disabled={isLoading}
                className="mt-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-3 rounded text-xs transition disabled:opacity-50"
              >
                {isLoading ? "🔍 Auditing Code..." : "Run Comprehensive Review"}
              </button>
            </div>

            {reviewResult && (
              <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700 whitespace-pre-wrap leading-relaxed font-sans text-xs">
                {reviewResult}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXPLAIN */}
        {activeTab === "explain" && (
          <div className="space-y-3">
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col gap-2">
              <p className="font-semibold text-gray-300">Code Explanation</p>
              <p className="text-gray-400 text-[11px]">
                Breaks down algorithms, functions, and architecture into easy-to-understand concepts.
              </p>
              <button
                onClick={handleRunExplain}
                disabled={isLoading}
                className="mt-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded text-xs transition disabled:opacity-50"
              >
                {isLoading ? "💡 Analyzing Logic..." : "Explain Active Code"}
              </button>
            </div>

            {explainResult && (
              <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700 whitespace-pre-wrap leading-relaxed font-sans text-xs">
                {explainResult}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FIX / PATCH */}
        {activeTab === "fix" && (
          <div className="space-y-3">
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col gap-2">
              <p className="font-semibold text-gray-300">Automated Code Repair</p>
              <p className="text-gray-400 text-[11px]">
                Describe an error, unexpected output, or let Gemini fix all issues automatically.
              </p>
              <textarea
                rows={2}
                placeholder="Optional: specify error message or desired behavior..."
                value={fixIssueInput}
                onChange={(e) => setFixIssueInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs p-2 rounded outline-none focus:border-purple-500"
              />
              <button
                onClick={handleRequestFix}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded text-xs transition disabled:opacity-50"
              >
                {isLoading ? "⚡ Generating Patch..." : "Fix & Generate Solution"}
              </button>
            </div>

            {fixResult && (
              <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700 space-y-3">
                <div className="whitespace-pre-wrap leading-relaxed text-xs">
                  {fixResult.explanation}
                </div>

                {fixResult.fixedCode && onApplyCodeFix && (
                  <div className="pt-2 border-t border-gray-700">
                    <button
                      onClick={() => onApplyCodeFix(fixResult.fixedCode)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <span>✓</span> Apply Fix Directly to Editor
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat input footer (only in chat tab) */}
      {activeTab === "chat" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat();
          }}
          className="p-2.5 border-t border-gray-800 flex gap-1.5"
        >
          <input
            type="text"
            placeholder="Ask Gemini about this file..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-gray-800 text-gray-200 text-xs px-3 py-2 rounded outline-none border border-gray-700 focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={isLoading || !chatInput.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-xs font-semibold transition disabled:opacity-50"
          >
            ➤
          </button>
        </form>
      )}
    </div>
  );
};

export default AIPanel;
