import { useEffect, useState } from "react"

// Fallback to localhost for local dev
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
console.log("✅ Backend URL:", process.env.NEXT_PUBLIC_BACKEND_URL)



export default function Home() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  useEffect(() => {
    console.log("✅ Using backend:", BACKEND_URL)
    fetchUploadedFiles()
  }, [])

  const askQuestion = async () => {
    setLoading(true)
    setAnswer("")

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    })

    if (!res.body) {
      setAnswer("❌ No response stream.")
      setLoading(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")

    let done = false
    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading
      const chunk = decoder.decode(value || new Uint8Array(), { stream: true })
      setAnswer((prev) => prev + chunk)
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

      const res = await fetch(`${BACKEND_URL}/upload`, {
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

    await fetch(`${BACKEND_URL}/reset`, { method: "POST" })
    setUploadStatus("🗑️ Memory cleared.")
    setAnswer("")
    setUploadedFiles([])
  }

  const fetchUploadedFiles = async () => {
    const res = await fetch(`${BACKEND_URL}/files`)
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
          <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Answer:</h2>
            <p className="whitespace-pre-line text-gray-700">{answer}</p>
          </div>
        )}
      </div>
    </div>
  )
}
