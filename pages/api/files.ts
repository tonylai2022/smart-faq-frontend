import { NextApiRequest, NextApiResponse } from "next";
import { uploadedFiles, memories } from "./upload";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        return res.status(200).json({ files: uploadedFiles });
    } else if (req.method === "POST") {
        // Clear the files and memories
        uploadedFiles.length = 0;
        memories.length = 0;
        return res.status(200).json({ message: "Files cleared successfully" });
    } else {
        return res.status(405).json({ error: "Method not allowed" });
    }
}
