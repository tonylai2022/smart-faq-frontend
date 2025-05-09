import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { searchDocs } from "../../utils/search_docs";
import { embedQuestion } from "../../utils/embedding";
import type { Memory } from "../../utils/search_docs";
import { memoryChunks } from './upload';

let conversationHistory: { role: "user" | "assistant"; content: string }[] = [];

// 讀取記憶
function loadMemories(): Memory[] {
    try {
        const cachePath = path.join(process.cwd(), "cache", "latest.json");
        if (fs.existsSync(cachePath)) {
            const data = fs.readFileSync(cachePath, "utf8");
            return JSON.parse(data) as Memory[];
        }
        console.warn("⚠️ No memory cache found.");
        return [];
    } catch (err) {
        console.error("❌ Failed to load memories:", err);
        return [];
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { question, max_sentences, language } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        if (!process.env.DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: "❌ Missing DeepSeek API Key." });
        }

        const memories = loadMemories();
        if (!memories || memories.length === 0) {
            return res.status(400).json({ error: "❌ 尚未上傳資料，請先上傳 PDF。" });
        }

        // Set up the response stream
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Add language instruction to the prompt
        const languageInstruction = language === 'zh'
            ? 'Please respond in Traditional Chinese (繁體中文).'
            : 'Please respond in English.';

        const prompt = `${languageInstruction} Keep the response concise, maximum ${max_sentences} sentences. Question: ${question}`;

        const queryEmbedding = await embedQuestion(prompt);

        const topK = 5;
        const relatedChunks = searchDocs(queryEmbedding, memories, topK, 0.4); // 可自己調
        const relatedContext = relatedChunks.length > 0
            ? relatedChunks.join("\n\n")
            : "（找不到明確資料，請根據常識推測）";

        conversationHistory.push({ role: "user", content: question });

        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                temperature: 0.3,
                messages: [
                    {
                        role: "system",
                        content: language === 'zh'
                            ? `你是專業文件助理。
以下是找到的相關資料：
------
${relatedContext}
------
請用繁體中文回答用戶問題。回答必須：
1. 簡潔精確，直指重點
2. 只包含必要資訊
3. 避免冗長解釋
如果資料不足，可合理推測，但請標明推測。
如果完全無資料，請回答：「根據目前資料，無法找到確切資訊。」`
                            : `You are a professional document assistant.
Here is the relevant information found:
------
${relatedContext}
------
Provide a direct, factual answer to the user's question. Follow these strict guidelines:
1. Use bullet points or numbered lists when possible
2. Keep each point to one line
3. Use precise, technical language
4. Omit unnecessary words and explanations
5. If uncertain, state "Insufficient information" and provide a brief reason

If the information is insufficient, respond with: "Insufficient information: [brief reason]"
If no relevant information exists, respond with: "No relevant information found."`
                    },
                    ...conversationHistory,
                ],
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("❌ DeepSeek API Error:", errText);
            return res.status(500).json({ error: "❌ Failed to fetch from DeepSeek." });
        }

        const data = await response.json();
        // Process the raw answer
        let rawAnswer = data.choices?.[0]?.message?.content?.trim() || "❌ No answer.";

        // 多層解析直到是純文字
        try {
            let parsed: any = JSON.parse(rawAnswer);
            while (typeof parsed === "object" && parsed !== null && "answer" in parsed) {
                parsed = parsed.answer;
                if (typeof parsed === "string") {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch {
                        // 如果不能再 parse，代表是純文字
                        rawAnswer = parsed;
                        break;
                    }
                }
            }
        } catch {
            // 不是 JSON，保留原本
        }

        // 清理格式
        const cleanAnswer = rawAnswer
            .replace(/\\n/g, '\n')    // \n 變成真換行
            .replace(/\*\*/g, '')     // 移除粗體標記 **
            .replace(/\s+\n/g, '\n')  // 多餘空白
            .trim();

        const answer = cleanAnswer;

        conversationHistory.push({ role: "assistant", content: answer });

        // 防止記憶暴衝
        if (conversationHistory.length > 10) {
            conversationHistory = conversationHistory.slice(-10);
        }

        res.write(answer);
        res.end();
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
}
