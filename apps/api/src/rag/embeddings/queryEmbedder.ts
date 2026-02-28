/**
 * queryEmbedder.ts
 * apps/api/src/rag/embeddings/queryEmbedder.ts
 *
 * Embeds a user's natural language query for similarity search.
 *
 * IMPORTANT: Uses taskType RETRIEVAL_QUERY (not RETRIEVAL_DOCUMENT).
 * Gemini text-embedding-004 is asymmetric — documents and queries
 * must use different task types to get optimal similarity scores.
 * Using the wrong task type degrades retrieval quality significantly.
 */

const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const TASK_TYPE_QUERY = "RETRIEVAL_QUERY";

export const GEMINI_EMBEDDING_DIM = 768;

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function embedQuery(query: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    return await embedQueryWithGemini(query, apiKey);
  }

  // Fallback for local dev without API key
  return await embedQueryWithXenova(query);
}

// ─── Gemini Query Embedding ───────────────────────────────────────────────────

async function embedQueryWithGemini(
  query: string,
  apiKey: string
): Promise<number[]> {
  const url = `${GEMINI_API_BASE}/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: { parts: [{ text: query }] },
      taskType: TASK_TYPE_QUERY,  // ← Critical: different from indexing task type
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini query embedding failed ${response.status}: ${error}`);
  }

  const data = await response.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

// ─── Xenova Fallback ──────────────────────────────────────────────────────────

async function embedQueryWithXenova(query: string): Promise<number[]> {
  try {
    const { pipeline } = await import("@xenova/transformers" as any);
    const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    const output = await embedder([query]);
    return Array.from(output[0].data) as number[];
  } catch {
    throw new Error(
      "[QueryEmbedder] No GEMINI_API_KEY set and @xenova/transformers not installed."
    );
  }
}