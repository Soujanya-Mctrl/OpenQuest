import type { CodeChunk } from "../ingestion/astChunker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmbeddedChunk {
  chunk: CodeChunk;
  embedding: number[];   // 768-dim vector for text-embedding-004
  embeddedAt: Date;
}

export interface EmbeddingResult {
  embedded: EmbeddedChunk[];
  model: string;
  totalTokensUsed?: number;
  durationMs: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_BATCH_SIZE = 100;      // Gemini's max texts per embed request
const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
const GEMINI_EMBEDDING_DIM = 768;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Task type for code retrieval — tells Gemini what this embedding is for
// RETRIEVAL_DOCUMENT = used when indexing, RETRIEVAL_QUERY = used when searching
const TASK_TYPE_DOCUMENT = "RETRIEVAL_DOCUMENT";

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function embedChunks(chunks: CodeChunk[]): Promise<EmbeddingResult> {
  const startTime = Date.now();

  if (chunks.length === 0) {
    return { embedded: [], model: GEMINI_EMBEDDING_MODEL, durationMs: 0 };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const useGemini = !!apiKey;

  console.log(
    `[Embedder] Embedding ${chunks.length} chunks using ${useGemini ? "Gemini" : "Xenova (local fallback)"}`
  );

  let embedded: EmbeddedChunk[];
  let model: string;
  let totalTokensUsed: number | undefined;

  if (useGemini) {
    const result = await embedWithGemini(chunks, apiKey!);
    embedded = result.embedded;
    model = GEMINI_EMBEDDING_MODEL;
    totalTokensUsed = result.totalTokensUsed;
  } else {
    embedded = await embedWithXenova(chunks);
    model = "Xenova/all-MiniLM-L6-v2";
  }

  const durationMs = Date.now() - startTime;

  console.log(
    `[Embedder] ✅ Embedded ${embedded.length} chunks in ${durationMs}ms` +
      (totalTokensUsed ? ` (~${totalTokensUsed} tokens)` : "")
  );

  return { embedded, model, totalTokensUsed, durationMs };
}

// ─── Gemini Embedding ─────────────────────────────────────────────────────────

async function embedWithGemini(
  chunks: CodeChunk[],
  apiKey: string
): Promise<{ embedded: EmbeddedChunk[]; totalTokensUsed: number }> {
  const embedded: EmbeddedChunk[] = [];
  let totalTokensUsed = 0;

  // Process in batches of GEMINI_BATCH_SIZE
  for (let i = 0; i < chunks.length; i += GEMINI_BATCH_SIZE) {
    const batch = chunks.slice(i, i + GEMINI_BATCH_SIZE);
    const batchNum = Math.floor(i / GEMINI_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / GEMINI_BATCH_SIZE);

    console.log(`[Embedder] Batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

    const vectors = await callGeminiBatchEmbed(batch, apiKey);

    for (let j = 0; j < batch.length; j++) {
      embedded.push({
        chunk: batch[j],
        embedding: vectors[j],
        embeddedAt: new Date(),
      });
    }

    // Rough token estimate: ~1 token per 4 chars
    totalTokensUsed += batch.reduce((sum, c) => sum + Math.ceil(c.content.length / 4), 0);

    // Rate limit safety: pause briefly between batches
    if (i + GEMINI_BATCH_SIZE < chunks.length) {
      await sleep(200);
    }
  }

  return { embedded, totalTokensUsed };
}

/**
 * Calls the Gemini batchEmbedContents API endpoint.
 * Returns an array of vectors in the same order as input chunks.
 *
 * Docs: https://ai.google.dev/api/embeddings#v1beta.models.batchEmbedContents
 */
async function callGeminiBatchEmbed(
  chunks: CodeChunk[],
  apiKey: string
): Promise<number[][]> {
  const url = `${GEMINI_API_BASE}/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;

  const requestBody = {
    requests: chunks.map((chunk) => ({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: {
        parts: [
          {
            // Prepend file path so the model understands context
            text: buildEmbedText(chunk),
          },
        ],
      },
      taskType: TASK_TYPE_DOCUMENT,
    })),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini embedding API error ${response.status}: ${errorText}`
    );
  }

  const data = await response.json() as {
    embeddings: Array<{ values: number[] }>;
  };

  if (!data.embeddings || data.embeddings.length !== chunks.length) {
    throw new Error(
      `Gemini returned ${data.embeddings?.length ?? 0} embeddings for ${chunks.length} chunks`
    );
  }

  return data.embeddings.map((e) => e.values);
}

/**
 * Builds the text we actually send to the embedding model.
 * Prepending the file path gives the model crucial context —
 * "this is src/auth/login.ts" helps it understand the code's purpose.
 */
function buildEmbedText(chunk: CodeChunk): string {
  const header = [
    `File: ${chunk.filePath}`,
    chunk.symbolName ? `Symbol: ${chunk.symbolName}` : null,
    `Language: ${chunk.language}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n\n${chunk.content}`;
}

// ─── Xenova Local Fallback ────────────────────────────────────────────────────

/**
 * Uses @xenova/transformers to run embeddings locally.
 * Model: all-MiniLM-L6-v2 (384-dim, tiny, fast)
 *
 * NOTE: Output dim is 384, not 768 like Gemini.
 * The pgvector schema must accommodate both dimensions
 * OR we only use Xenova in dev and never write to prod DB.
 *
 * For this project, Xenova is dev-only. Prod always uses Gemini.
 */
async function embedWithXenova(chunks: CodeChunk[]): Promise<EmbeddedChunk[]> {
  // Dynamic import — Xenova is optional and only installed in dev
  let pipeline: (task: string, model: string) => Promise<(texts: string[]) => Promise<{ data: Float32Array }[]>>;

  try {
    const { pipeline: xenovaPipeline } = await import("@xenova/transformers" as any);
    pipeline = xenovaPipeline;
  } catch {
    throw new Error(
      "[Embedder] Xenova not installed. Run: npm install @xenova/transformers\n" +
        "Or set GEMINI_API_KEY to use the Gemini API."
    );
  }

  console.log("[Embedder] Loading Xenova model (first run downloads ~80MB)...");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  const embedded: EmbeddedChunk[] = [];

  // Xenova processes one at a time (no native batching in the JS port)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const text = buildEmbedText(chunk);

    const output = await embedder([text]);
    // Mean pooling across token dimension to get a single vector
    const vector = Array.from(output[0].data) as number[];

    embedded.push({ chunk, embedding: vector, embeddedAt: new Date() });

    if (i % 50 === 0) {
      console.log(`[Embedder] Xenova: ${i + 1}/${chunks.length} chunks embedded`);
    }
  }

  return embedded;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}