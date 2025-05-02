import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { question } = req.body;

    try {
        const togetherRes = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "mistralai/Mistral-7B-Instruct-v0.2",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: question },
                ],
                temperature: 0.7,
                stream: false,
            }),
        });

        const togetherData = await togetherRes.json();
        const answer = togetherData.choices?.[0]?.message?.content || "❌ No answer.";

        res.status(200).json({ answer });
    } catch (err) {
        console.error("TogetherAI Error:", err);
        res.status(500).json({ error: "Failed to fetch answer." });
    }
}
