import type { NextApiRequest, NextApiResponse } from 'next';

// Global variables to store memory
let memoryChunks: string[] = [];
let uploadedFiles: string[] = [];

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Clear the arrays by reassigning them
        memoryChunks = [];
        uploadedFiles = [];

        res.status(200).json({ message: "Memory cleared successfully" });
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ error: 'Failed to reset memory' });
    }
}
