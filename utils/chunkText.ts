import { countTokens } from "./tokenCount";

export function chunkText(
    text: string,
    preferredChunkSize = 300,  
    overlapTokens = 50          
): string[] {
    const totalTokens = countTokens(text);
    console.log(`📊 文件總 tokens: ${totalTokens}`);

    // ⏩ 強制使用傳入的 chunkSize
    const chunkSize = preferredChunkSize;
    console.log(`📐 使用 chunkSize: ${chunkSize}, overlapTokens: ${overlapTokens}`);

    const paragraphs = text.split(/\n\s*\n/); // 依空白行分段
    const chunks: string[] = [];

    let currentChunk = "";
    let currentTokens = 0;

    for (const para of paragraphs) {
        const cleanPara = para.trim();
        if (!cleanPara) continue;

        const paraTokens = countTokens(cleanPara);

        // 單段太長 ➔ 切句子
        if (paraTokens > chunkSize) {
            const sentences = cleanPara.split(/(?<=[。！？\n])/); // 按中文句子分
            let tempChunk = "";
            let tempTokens = 0;

            for (const sentence of sentences) {
                const sentTokens = countTokens(sentence);
                if (tempTokens + sentTokens > chunkSize) {
                    if (tempChunk.trim()) chunks.push(tempChunk.trim());
                    tempChunk = sentence;
                    tempTokens = sentTokens;
                } else {
                    tempChunk += sentence;
                    tempTokens += sentTokens;
                }
            }

            if (tempChunk.trim()) {
                chunks.push(tempChunk.trim());
            }
            continue; // 完成這段
        }

        // 正常情況累積
        if (currentTokens + paraTokens <= chunkSize) {
            currentChunk += cleanPara + "\n\n";
            currentTokens += paraTokens;
        } else {
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = cleanPara + "\n\n";
            currentTokens = paraTokens;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    // ✅ 加 Overlap
    const finalChunks = overlapTokens > 0 && chunks.length > 1
        ? applyOverlap(chunks, overlapTokens)
        : chunks;

    printChunkStats(finalChunks);

    return finalChunks;
}

// ➡️ 處理 Overlap
function applyOverlap(chunks: string[], overlapTokens: number): string[] {
    const overlappedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
        let combined = chunks[i];
        if (i > 0) {
            const previousTokens = [...chunks[i - 1]];
            const overlapText = previousTokens.slice(-overlapTokens).join('');
            combined = overlapText + combined;
        }
        overlappedChunks.push(combined);
    }

    return overlappedChunks;
}

// ➡️ 顯示 Chunk 統計資訊
function printChunkStats(chunks: string[]) {
    console.log("📈 Chunk 統計:");
    console.log(`👉 總 chunks 數量: ${chunks.length}`);
    const tokenCounts = chunks.map(chunk => countTokens(chunk));
    const totalTokens = tokenCounts.reduce((a, b) => a + b, 0);
    console.log(`👉 平均 tokens/chunk: ${(totalTokens / chunks.length).toFixed(2)}`);
    console.log(`👉 最大 tokens: ${Math.max(...tokenCounts)}, 最小 tokens: ${Math.min(...tokenCounts)}`);

    console.log("🔵 Chunks 預覽:");
    chunks.forEach((chunk, idx) => {
        console.log(`Chunk ${idx + 1}: ${chunk.slice(0, 50).replace(/\n/g, ' ')}... (tokens: ${countTokens(chunk)})`);
        console.log("---");
    });
}
