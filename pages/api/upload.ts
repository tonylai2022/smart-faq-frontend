import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { chunkText } from "../../utils/chunkText";
import { embedTexts } from "../../utils/embedding";
import type { Memory } from "../../utils/search_docs";

export const config = {
    api: {
        bodyParser: false,
        // Increase the size limit for file uploads
        responseLimit: '8mb',
    }
};

// Use a temporary directory for file processing
const TEMP_DIR = '/tmp';
const FILES_LIST_PATH = path.join(process.cwd(), "cache", "files.json");

function getUploadedFiles(): string[] {
    try {
        if (fs.existsSync(FILES_LIST_PATH)) {
            const data = fs.readFileSync(FILES_LIST_PATH, "utf8");
            return JSON.parse(data);
        }
        return [];
    } catch (err) {
        console.error("Failed to read files list:", err);
        return [];
    }
}

function saveUploadedFiles(files: string[]) {
    try {
        const cacheDir = path.join(process.cwd(), "cache");
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(FILES_LIST_PATH, JSON.stringify(files, null, 2));
    } catch (err) {
        console.error("Failed to save files list:", err);
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        const form = formidable({
            uploadDir: TEMP_DIR,
            keepExtensions: true,
            maxFileSize: 5 * 1024 * 1024, // 5MB limit
        });

        const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve([fields, files]);
            });
        });

        const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!uploaded) {
            return res.status(400).json({ error: "Invalid file upload" });
        }

        const filename = uploaded.originalFilename || uploaded.newFilename;

        // Update the files list
        const currentFiles = getUploadedFiles();
        if (!currentFiles.includes(filename)) {
            currentFiles.push(filename);
            saveUploadedFiles(currentFiles);
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

        const embeddings = await embedTexts(chunks);

        const memories = chunks.map((text, idx) => ({
            text,
            embedding: embeddings[idx],
        }));

        // Save memories to cache
        const cacheDir = path.join(process.cwd(), "cache");
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(path.join(cacheDir, "latest.json"), JSON.stringify(memories, null, 2));

        res.status(200).json({
            message: "✅ File processed successfully!",
            chunks: memories.length,
            filename: filename
        });

        // Clean up temporary files
        try {
            fs.unlinkSync(uploaded.filepath);
        } catch (err) {
            console.error("Failed to clean up temporary file:", err);
        }

    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to process upload" });
    }
}
