import { NextApiRequest, NextApiResponse } from "next";
import { uploadedFiles, clearUploadedFiles } from "./upload";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        return res.status(200).json({ files: uploadedFiles });
    } else if (req.method === "POST") {
        clearUploadedFiles();
        return res.status(200).json({ message: "Files cleared successfully" });
    } else {
        return res.status(405).json({ error: "Method not allowed" });
    }
}
