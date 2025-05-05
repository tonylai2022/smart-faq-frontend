import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { chunkText } from "../../utils/chunkText"; // 記得要 ultra fine
import { embedTexts } from "../../utils/embedding";
import type { Memory } from "../../utils/search_docs";

export const config = { api: { bodyParser: false } };

let memories: Memory[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const uploadDir = path.join(process.cwd(), "/uploads");
    const cacheDir = path.join(process.cwd(), "/cache");
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.mkdirSync(cacheDir, { recursive: true });

    const form = formidable({ uploadDir, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Upload failed" });
        }

        const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!uploaded) {
            return res.status(400).json({ error: "Invalid file upload" });
        }

        const fileBuffer = fs.readFileSync(uploaded.filepath);
        const pdfData = await pdfParse(fileBuffer);

        const cleanedText = pdfData.text
            .replace(/[\t\r]+/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        const chunks = chunkText(cleanedText, 400, 50); 
        console.log(`🔵 Chunks Preview (${chunks.length}):`);
        chunks.forEach((chunk, idx) => {
            console.log(`Chunk ${idx + 1}:`, chunk.slice(0, 30), "...");
        });

        memories = [];

        const embeddings = await embedTexts(chunks);

        memories = chunks.map((text, idx) => ({
            text,
            embedding: embeddings[idx],
        }));

        const cachePath = path.join(cacheDir, `${uploaded.newFilename}.json`);
        fs.writeFileSync(cachePath, JSON.stringify(memories, null, 2));

        // ✅ 另外保存最新記憶
        fs.writeFileSync(path.join(cacheDir, "latest.json"), JSON.stringify(memories, null, 2));

        res.status(200).json({ message: "✅ 檔案已上傳並處理完成！", chunks: memories.length });
    });
}

export { memories };
