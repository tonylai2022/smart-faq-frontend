const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

if (!OPENAI_API_KEY) {
    throw new Error("❌ Missing OpenAI API Key");
}

const EMBEDDING_MODEL = "text-embedding-ada-002";
const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const MAX_INPUT_LENGTH = 8000; // 如果有超長字串，安全起見切短

// 🧠 單條問題 Embedding
export async function embedQuestion(question: string): Promise<number[]> {
    const cleanInput = question.slice(0, MAX_INPUT_LENGTH);

    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: cleanInput,
        }),
    });

    if (!res.ok) {
        console.error("❌ OpenAI Embedding API Error:", await res.text());
        throw new Error("Failed to embed question.");
    }

    const data = await res.json();
    return data.data[0].embedding;
}

// 🧠 多段文字 Embedding (自動分批 + 自動重試)
export async function embedTexts(texts: string[]): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        // ✅ 只保留非空白的段落
        const batch = texts.slice(i, i + BATCH_SIZE)
            .map(text => text.trim())
            .filter(text => text.length > 0)
            .map(text => text.length > MAX_INPUT_LENGTH ? text.slice(0, MAX_INPUT_LENGTH) : text);

        if (batch.length === 0) {
            console.warn(`⚠️ Skipped empty batch ${Math.floor(i / BATCH_SIZE) + 1}`);
            continue;
        }

        let retries = 0;
        while (retries < MAX_RETRIES) {
            try {
                const res = await fetch("https://api.openai.com/v1/embeddings", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: EMBEDDING_MODEL,
                        input: batch,
                    }),
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("❌ OpenAI Embedding API Error:", errorText);
                    throw new Error("Failed to embed batch.");
                }

                const data = await res.json();
                const embeddings = data.data.map((item: any) => item.embedding);

                console.log(`✅ Embedded batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} texts`);
                allEmbeddings.push(...embeddings);
                break;
            } catch (err) {
                retries++;
                console.warn(`⚠️ Retry attempt ${retries} for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
                if (retries >= MAX_RETRIES) {
                    throw new Error(`❌ Failed to embed after ${MAX_RETRIES} retries.`);
                }
                await delay(1000 * retries);
            }
        }
    }

    return allEmbeddings;
}


// 延遲工具
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
