import { useEffect, useRef, useState } from "react";

const PROXY_URL = "/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🧹 初始化：讀 localStorage 聊天紀錄
  useEffect(() => {
    console.log("✅ Using proxy:", PROXY_URL);
    const saved = localStorage.getItem("chatMessages");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // 📦 聊天紀錄更新 ➔ 自動存 localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 🧠 問問題
  const askQuestion = async () => {
    if (!question.trim()) return;

    const userMsg: Message = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch(`${PROXY_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.content }),
      });

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let assistantContent = "";

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunk = decoder.decode(value || new Uint8Array(), { stream: true });
          assistantContent += chunk;

          setMessages(prev => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.role === "assistant") {
              updated[updated.length - 1].content = assistantContent;
            } else {
              updated.push({ role: "assistant", content: assistantContent });
            }
            return updated;
          });
        }
      } else {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.answer || "❌ No answer received." }]);
      }
    } catch (err) {
      console.error("❌ Ask error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Failed to get response." }]);
    }

    setLoading(false);
  };

  // 📥 上傳PDF
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus("🚀 Uploading...");
    const formData = new FormData();
    formData.append("file", files[0]);

    try {
      const res = await fetch(`${PROXY_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      setUploadStatus(`✅ 檔案已上傳，切成 ${result.chunks} 段！`);
    } catch (err) {
      console.error("❌ Upload error:", err);
      setUploadStatus("❌ Upload failed.");
    }
  };

  // 🗑️ 清除聊天 + 記憶體
  const clearHistory = async () => {
    const confirm = window.confirm("確定要清除聊天記錄與記憶體嗎？");
    if (!confirm) return;

    localStorage.removeItem("chatMessages");
    setMessages([]);

    try {
      await fetch(`${PROXY_URL}/reset`, { method: "POST" });
      setUploadStatus("🗑️ Memory cleared.");
    } catch (err) {
      console.error("❌ Failed to reset memory:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg p-6 flex flex-col space-y-4">
        <h1 className="text-3xl font-bold text-center text-blue-600">中文智能文件助理</h1>

        {/* Upload Area */}
        <div className="space-y-2">
          <input
            type="file"
            accept=".pdf"
            onChange={uploadFile}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-300 file:rounded-md file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {uploadStatus && (
            <div className="text-sm text-green-600">{uploadStatus}</div>
          )}
        </div>

        {/* Clear Button */}
        <button
          onClick={clearHistory}
          className="px-4 py-2 bg-white text-red-600 border border-red-400 rounded hover:bg-red-100 transition font-semibold"
        >
          🗑️ 清除聊天記錄與記憶體
        </button>

        {/* Chat Window */}
        <div className="flex flex-col space-y-3 p-4 bg-gray-50 rounded-md border border-gray-200 max-h-[400px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 rounded-2xl shadow-md max-w-xs ${msg.role === "user" ? "self-end bg-blue-200" : "self-start bg-gray-200"
                }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
          {loading && (
            <div className="self-start bg-gray-200 px-4 py-2 rounded-2xl shadow-md max-w-xs animate-pulse">
              載入中...
            </div>
          )}
        </div>

        {/* Input Area */}
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-200"
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="請輸入你的問題..."
        />

        <button
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={askQuestion}
          disabled={loading}
        >
          {loading ? "搜尋中..." : "提問"}
        </button>
      </div>
    </div>
  );
}
