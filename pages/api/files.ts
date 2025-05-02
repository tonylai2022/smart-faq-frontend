import { NextApiRequest, NextApiResponse } from "next";
import { uploadedFiles } from "./upload";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    res.status(200).json({ files: uploadedFiles });
}
