import React, { useState, useRef, useEffect } from "react";

const Chat = ({ messages = [], onSendMessage, currentUsername, onClose }) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800 text-gray-200 select-none">
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>💬</span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400">
            Room Discussion
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet.</p>
            <p className="text-[11px] mt-1">Start chatting with your team!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.system) {
            return (
              <div key={i} className="text-center text-[10px] text-gray-500 my-1 italic">
                {msg.text}
              </div>
            );
          }

          const isSelf = msg.username === currentUsername;

          return (
            <div
              key={i}
              className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400">
                <span className="font-semibold text-gray-300">{msg.username}</span>
                {msg.timestamp && <span className="text-gray-600">{msg.timestamp}</span>}
              </div>
              <div
                className={`px-3 py-1.5 rounded-lg max-w-[85%] break-words ${
                  isSelf
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Input */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-gray-800 text-gray-200 text-xs px-3 py-2 rounded outline-none border border-gray-700 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-semibold transition disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default Chat;
