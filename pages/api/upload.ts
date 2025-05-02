import { NextApiRequest, NextApiResponse } from "next";

let memoryChunks: string[] = [];
let uploadedFiles: string[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const chunks = [`Sample chunk for ${Date.now()}`]; // Placeholder for real splitting
        memoryChunks.push(...chunks);
        uploadedFiles.push("sample_uploaded_file.txt"); // Placeholder filename

        res.status(200).json({ message: "File uploaded and embedded", chunks: chunks.length });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
}

// Export memory so others can use
export { memoryChunks, uploadedFiles };
