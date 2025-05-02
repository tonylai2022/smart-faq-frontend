import { NextApiRequest, NextApiResponse } from "next";
import { memoryChunks, uploadedFiles } from "./upload";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    memoryChunks.length = 0;
    uploadedFiles.length = 0;

    res.status(200).json({ message: "Memory cleared." });
}
