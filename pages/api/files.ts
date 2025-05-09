import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

// Use a JSON file to store uploaded files list
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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        const files = getUploadedFiles();
        return res.status(200).json({ files });
    } else if (req.method === "POST") {
        // Clear the files list
        saveUploadedFiles([]);
        return res.status(200).json({ message: "Files cleared successfully" });
    } else {
        return res.status(405).json({ error: "Method not allowed" });
    }
}
