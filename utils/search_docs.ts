import { cosineSimilarity } from "./similarity";

export interface Memory {
    text: string;
    embedding: number[];
}

/**
 * Semantic Search 超清楚版
 */
export function searchDocs(
    queryEmbedding: number[],
    memories: Memory[],
    topK = 5,
    similarityThreshold = 0.5,
    boost?: (memory: Memory) => number
): string[] {
    if (!queryEmbedding.length || !memories.length) {
        console.warn("⚠️ Empty query or memories, cannot search.");
        return [];
    }

    const scored = memories.map(mem => {
        const baseScore = cosineSimilarity(queryEmbedding, mem.embedding);
        const weight = boost ? boost(mem) : 1;
        return {
            text: mem.text,
            score: baseScore * weight,
        };
    });

    scored.sort((a, b) => b.score - a.score);

    const filtered = scored.filter(item => item.score >= similarityThreshold);
    const topChunks = filtered.slice(0, topK);

    console.log(`🔎 Semantic Search: 找到 ${topChunks.length} 個相關段落 (Top ${topK})`);

    // ✅ 這裡印出每段細節
    topChunks.forEach((item, idx) => {
        console.log(`📚 第${idx + 1}段 (相似度: ${item.score.toFixed(4)}):\n${summarizeText(item.text)}\n---`);
    });

    return topChunks.map(item => item.text);
}

// 小工具：只印每段前50字，避免塞爆console
function summarizeText(text: string, maxLength = 50): string {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}
