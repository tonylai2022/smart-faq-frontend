import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";

// Tell Next.js not to use default body parser
export const config = {
    api: {
        bodyParser: false,
    },
};

let memoryChunks: string[] = [];
let uploadedFiles: string[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const uploadDir = path.join(process.cwd(), "/uploads");
    fs.mkdirSync(uploadDir, { recursive: true });

    const form = formidable({ uploadDir, keepExtensions: true });

    form.parse(req, async (err, fields: any, files: any) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Upload failed." });
        }

        const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!uploaded) {
            return res.status(400).json({ error: "Invalid file upload." });
        }

        const filePath = uploaded.filepath;
        const originalFilename = uploaded.originalFilename || "unknown.pdf";

        if (!filePath) {
            return res.status(400).json({ error: "Filepath missing." });
        }

        const fileBuffer = fs.readFileSync(filePath);

        let extractedText = "";
        try {
            const pdfData = await pdfParse(fileBuffer);
            extractedText = pdfData.text;
        } catch (parseErr) {
            console.error("PDF Parse Error:", parseErr);
            return res.status(500).json({ error: "Failed to parse PDF" });
        }

        const chunks = extractedText.match(/.{1,300}/g) || [];

        memoryChunks.push(...chunks);
        uploadedFiles.push(originalFilename);

        res.status(200).json({ message: "File uploaded and parsed", chunks: chunks.length });
    });
}

export { memoryChunks, uploadedFiles };
