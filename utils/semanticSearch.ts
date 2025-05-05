import { embedQuestion } from "./embedding";
import { cosineSimilarity } from "./similarity"; // 下面我一併給
import type { Memory } from "./search_docs";

// 假設你有 memories 全局變數
declare const memories: Memory[];

/**
 * 真正的智能語意檢索
 */
export async function searchRelevantChunks(question: string, topK = 5): Promise<string[]> {
    const questionEmbedding = await embedQuestion(question); // 問題轉成 embedding

    const scored = memories.map(mem => ({
        text: mem.text,
        score: cosineSimilarity(mem.embedding, questionEmbedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(item => item.text);
}
