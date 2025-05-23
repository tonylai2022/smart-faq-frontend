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
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);

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
        // Check if the response indicates the question is irrelevant
        if (data.isIrrelevant) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: t('irrelevantQuestion')
          }]);
        } else {
          const answer = data.answer || t('noAnswer');
          setMessages(prev => [...prev, { role: "assistant", content: answer }]);
        }
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
    if (!files || files.length === 0) {
      setSelectedFileNames([]);
      return;
    }
    setSelectedFileNames(Array.from(files).map(f => f.name));
    setUploadStatus(t('loading'));

    try {
      // Upload each file sequentially
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);

        const res = await fetch(`${PROXY_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Failed to upload ${files[i].name}`);
        }
      }

      setUploadStatus(t('uploadSuccess'));
      // Update the list of uploaded files
      setUploadedFiles(prev => [...prev, ...Array.from(files).map(f => f.name)]);
    } catch (err) {
      console.error("❌ Upload error:", err);
      setUploadStatus(t('uploadError'));
    }
  };

  // Clear chat history
  const clearHistory = async () => {
    const confirm = window.confirm(t('clearHistoryConfirm'));
    if (!confirm) return;

    localStorage.removeItem("chatMessages");
    setMessages([]);
    setUploadStatus(t('historyCleared'));
  };

  // Clear uploaded files and memory
  const clearMemory = async () => {
    const confirm = window.confirm(t('clearMemoryConfirm'));
    if (!confirm) return;

    setUploadedFiles([]);
    setSelectedFileNames([]);
    setUploadStatus(t('loading'));

    try {
      await fetch(`${PROXY_URL}/reset`, { method: "POST" });
      setUploadStatus(t('memoryCleared'));
    } catch (err) {
      console.error("❌ Failed to reset memory:", err);
      setUploadStatus(t('error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-full sm:max-w-6xl bg-white shadow-xl rounded-lg p-2 sm:p-6 flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-800 flex-1">{t('welcome')}</h1>
          <LanguageSwitcher />
        </div>

        {/* Upload Area */}
        <div className="space-y-2">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={uploadFile}
              className="hidden"
            />
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded border border-gray-400 font-semibold hover:bg-blue-200">
              {t('chooseFiles')}
            </span>
          </label>
          <span className="ml-2 text-gray-800 align-middle">
            {selectedFileNames.length > 0 ? selectedFileNames.join(', ') : t('noFileChosen')}
          </span>
          {uploadStatus && (
            <div className="text-sm text-green-700">{uploadStatus}</div>
          )}
          {uploadedFiles.length > 0 && (
            <div className="text-sm text-gray-600">
              <div className="font-semibold mb-1">{t('uploadedFiles')}:</div>
              <ul className="list-disc list-inside">
                {uploadedFiles.map((fileName, index) => (
                  <li key={index} className="text-blue-600">{fileName}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Clear Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={clearMemory}
            className="flex-1 px-4 py-3 border-2 border-red-700 text-red-700 bg-white rounded font-bold text-lg flex items-center justify-center space-x-2 hover:bg-red-50 transition"
          >
            <span className="text-2xl">📁</span>
            <span>{t('clearMemory')}</span>
          </button>
          <button
            onClick={clearHistory}
            className="flex-1 px-4 py-3 border-2 border-red-700 text-red-700 bg-white rounded font-bold text-lg flex items-center justify-center space-x-2 hover:bg-red-50 transition"
          >
            <span className="text-2xl">🗑️</span>
            <span>{t('clearHistory')}</span>
          </button>
        </div>

        {/* Chat Window */}
        <div className="flex flex-col space-y-3 p-2 sm:p-4 bg-gray-100 rounded-md border border-gray-300 h-[50vh] min-h-[250px] max-h-[60vh] overflow-y-auto w-full">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 rounded-2xl shadow-md w-fit max-w-full sm:max-w-2xl break-words ${msg.role === "user"
                ? "self-end bg-blue-100 text-blue-900 ml-auto"
                : "self-start bg-gray-200 text-gray-900 mr-auto"
                }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
          {loading && (
            <div className="self-start bg-gray-200 px-4 py-2 rounded-2xl shadow-md w-fit max-w-full sm:max-w-2xl animate-pulse text-gray-900">
              {t('loading')}
            </div>
          )}
        </div>

        {/* Input Area */}
        <textarea
          className="w-full border border-gray-400 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 resize-none"
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              askQuestion();
            }
          }}
          placeholder={t('askQuestion')}
        />
        <button
          onClick={askQuestion}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-md font-bold text-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
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
