import { NextApiRequest, NextApiResponse } from "next";

// In-memory chat history
let chatHistory: { role: "user" | "assistant"; content: string }[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { question } = req.body;

    try {
        // Add user's latest question to history
        chatHistory.push({ role: "user", content: question });

        const deepseekRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a chatbot assistant. Always answer very concisely and clearly in 1-2 sentences." },
                    ...chatHistory,  // <== 📚 include all history!
                ],
                temperature: 0.3,  // lower temperature = more focused and consistent
                stream: false,
            }),
        });

        const data = await deepseekRes.json();
        const answer = data.choices?.[0]?.message?.content || "❌ No answer.";

        // Add assistant's reply to history too
        chatHistory.push({ role: "assistant", content: answer });

        res.status(200).json({ answer });
    } catch (err) {
        console.error("DeepSeek API Error:", err);
        res.status(500).json({ error: "Failed to fetch answer." });
    }
}
