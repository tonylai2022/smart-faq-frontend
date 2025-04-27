import { useEffect, useRef, useState } from "react"

// ✅ Use the proxy endpoint directly
const PROXY_URL = "/api/proxy"

export default function Home() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const answerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log("✅ Using proxy:", PROXY_URL)
    fetchUploadedFiles()
  }, [])

  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight
    }
  }, [answer])

  const askQuestion = async () => {
    setLoading(true)
    setAnswer("")

    try {
      const res = await fetch(`${PROXY_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      })

      const contentType = res.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        const data = await res.json()
        setAnswer(data.answer || "❌ No answer received.")
      } else if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder("utf-8")

        let done = false
        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          const chunk = decoder.decode(value || new Uint8Array(), { stream: true })
          setAnswer((prev) => prev + chunk)
        }
      } else {
        setAnswer("❌ No valid response.")
      }
    } catch (err) {
      console.error("❌ Error asking question:", err)
      setAnswer("❌ Failed to get response.")
    }

    setLoading(false)
  }

  const uploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    let totalChunks = 0
    for (const file of files) {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`${PROXY_URL}/upload`, {
        method: "POST",
        body: formData,
      })

      const result = await res.json()
      totalChunks += result.chunks
    }

    setUploadStatus(`✅ ${files.length} file(s) uploaded. ${totalChunks} chunks embedded.`)
    fetchUploadedFiles()
  }

  const clearMemory = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear all embedded memory?")
    if (!confirmClear) return

    await fetch(`${PROXY_URL}/reset`, { method: "POST" })
    setUploadStatus("🗑️ Memory cleared.")
    setAnswer("")
    setUploadedFiles([])
  }

  const fetchUploadedFiles = async () => {
    const res = await fetch(`${PROXY_URL}/files`)
    const data = await res.json()
    setUploadedFiles(data.files)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-lg p-6 space-y-4">
        <h1 className="text-3xl font-bold text-center text-blue-600">Smart FAQ Assistant</h1>

        <div className="space-y-2">
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            multiple
            onChange={uploadFiles}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-300 file:rounded-md file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {uploadStatus && <div className="text-green-600 font-medium">{uploadStatus}</div>}
          {uploadedFiles.length > 0 && (
            <div className="text-sm text-gray-600">
              <strong>Uploaded Files:</strong>
              <ul className="list-disc ml-5">
                {uploadedFiles.map((file, idx) => (
                  <li key={idx}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <textarea
          className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-200"
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question based on your uploaded documents..."
        />

        <div className="flex flex-wrap gap-3">
          <button
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={askQuestion}
            disabled={loading}
          >
            {loading ? "Asking..." : "Ask"}
          </button>

          <button
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={clearMemory}
          >
            Clear Memory
          </button>
        </div>

        {answer && (
          <div
            ref={answerRef}
            className="bg-gray-50 p-4 rounded border border-gray-200 mt-4 max-h-96 overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Answer:</h2>
            <p className="whitespace-pre-line text-gray-700">{answer}</p>
          </div>
        )}
      </div>
    </div>
  )
}
