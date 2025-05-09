import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useRouter } from 'next/router';

const PROXY_URL = "/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Initialize: Read chat history from localStorage
  useEffect(() => {
    console.log("✅ Using proxy:", PROXY_URL);
    const saved = localStorage.getItem("chatMessages");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Ask question
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
        body: JSON.stringify({
          question: userMsg.content,
          language: router.locale
        }),
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
        const answer = data.answer || t('noAnswer');
        setMessages(prev => [...prev, { role: "assistant", content: answer }]);
      }
    } catch (err) {
      console.error("❌ Ask error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: t('error') }]);
    }

    setLoading(false);
  };

  // Upload PDF
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus(t('loading'));
    const formData = new FormData();
    formData.append("file", files[0]);

    try {
      const res = await fetch(`${PROXY_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      setUploadStatus(t('uploadSuccess'));
    } catch (err) {
      console.error("❌ Upload error:", err);
      setUploadStatus(t('uploadError'));
    }
  };

  // Clear chat history and memory
  const clearHistory = async () => {
    const confirm = window.confirm(t('clearConfirm'));
    if (!confirm) return;

    localStorage.removeItem("chatMessages");
    setMessages([]);

    try {
      await fetch(`${PROXY_URL}/reset`, { method: "POST" });
      setUploadStatus(t('memoryCleared'));
    } catch (err) {
      console.error("❌ Failed to reset memory:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg p-6 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-center text-blue-800">{t('welcome')}</h1>
          <LanguageSwitcher />
        </div>

        {/* Upload Area */}
        <div className="space-y-2">
          <input
            type="file"
            accept=".pdf"
            onChange={uploadFile}
            className="block w-full text-sm text-gray-800 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-400 file:rounded-md file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200"
          />
          {uploadStatus && (
            <div className="text-sm text-green-700">{uploadStatus}</div>
          )}
        </div>

        {/* Clear Button */}
        <button
          onClick={clearHistory}
          className="px-4 py-2 bg-white text-red-700 border border-red-500 rounded hover:bg-red-50 transition font-semibold"
        >
          🗑️ {t('clearHistory')}
        </button>

        {/* Chat Window */}
        <div className="flex flex-col space-y-3 p-4 bg-gray-100 rounded-md border border-gray-300 max-h-[400px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 rounded-2xl shadow-md max-w-xs ${msg.role === "user" ? "self-end bg-blue-100 text-blue-900" : "self-start bg-gray-200 text-gray-900"
                }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
          {loading && (
            <div className="self-start bg-gray-200 px-4 py-2 rounded-2xl shadow-md max-w-xs animate-pulse text-gray-900">
              {t('loading')}
            </div>
          )}
        </div>

        {/* Input Area */}
        <textarea
          className="w-full border border-gray-400 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900"
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('questionPlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!loading && question.trim()) {
                askQuestion();
              }
            }
          }}
        />

        <button
          className="w-full px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50 font-semibold"
          onClick={askQuestion}
          disabled={loading}
        >
          {loading ? t('loading') : t('ask')}
        </button>
      </div>
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
