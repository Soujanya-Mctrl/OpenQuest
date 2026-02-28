---
name: rag
description: >
  Use this skill whenever the user wants to build a Retrieval-Augmented Generation (RAG) pipeline
  or AI layer. Triggers include: 'add AI to my app', 'set up RAG', 'connect LLM to my data',
  'build a chatbot over documents', 'vector search', 'embeddings', 'semantic search',
  'integrate Anthropic Claude', 'chunk documents', 'build a knowledge base',
  'AI-powered search', or 'runRagPipeline'. Also use for setting up vector databases
  (Pinecone, pgvector, Chroma via HTTP), streaming responses, and multi-turn conversation memory.
  Stack: Node.js + TypeScript + Anthropic SDK + Pinecone (or pgvector) + transformers.js.
license: MIT
---

# 🧠 RAG / AI Layer Skill — Node.js + TypeScript + Anthropic

> A fully typed, Node-native RAG pipeline that slots directly into the Express backend.

---

## 🗺️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         RAG PIPELINE                         │
│                                                              │
│  INGEST (run once / on upload)                               │
│  Documents → Chunker → Embedder → Vector DB (Pinecone)       │
│                                                              │
│  QUERY (per request, called by BullMQ worker)                │
│  User Query → Embedder → Similarity Search → Top-K Chunks    │
│                    ↓                                         │
│       [System Prompt + Chunks + Query] → Claude → Answer     │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Quick Reference

| Component         | Choice                         | Install                                    |
|-------------------|--------------------------------|--------------------------------------------|
| LLM               | Anthropic Claude (claude-sonnet-4-20250514) | `npm i @anthropic-ai/sdk`    |
| Embeddings        | `@xenova/transformers` (local) | `npm i @xenova/transformers`               |
| Vector DB (cloud) | Pinecone                       | `npm i @pinecone-database/pinecone`        |
| Vector DB (local) | pgvector via Prisma            | Prisma extension (see below)               |
| PDF parsing       | pdf-parse                      | `npm i pdf-parse`                          |
| Text chunking     | Custom (included below)        | —                                          |

---

## 🏗️ Project Structure

```
rag/
├── src/
│   ├── pipeline.ts          # ← main export: runRagPipeline(query)
│   ├── config.ts            # env vars
│   ├── ingest/
│   │   ├── loader.ts        # load PDF, txt, HTML
│   │   ├── chunker.ts       # split into overlapping chunks
│   │   └── embedder.ts      # embed chunks → float[]
│   ├── retrieval/
│   │   ├── vectorStore.ts   # Pinecone init + upsert + query
│   │   └── retriever.ts     # top-K search wrapper
│   ├── generation/
│   │   ├── prompts.ts       # system prompt templates
│   │   └── llm.ts           # Anthropic client wrapper
│   └── types.ts
├── .env
└── package.json             # or shared via monorepo workspace
```

---

## 🚀 Bootstrap

### 1. Install

```bash
npm install @anthropic-ai/sdk @pinecone-database/pinecone @xenova/transformers pdf-parse
npm install -D @types/pdf-parse
```

### 2. `config.ts`

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const schema = z.object({
  ANTHROPIC_API_KEY: z.string(),
  PINECONE_API_KEY: z.string(),
  PINECONE_INDEX: z.string().default('knowledge-base'),
  EMBEDDING_MODEL: z.string().default('Xenova/all-MiniLM-L6-v2'),
  LLM_MODEL: z.string().default('claude-sonnet-4-20250514'),
  TOP_K: z.coerce.number().default(5),
  LLM_MAX_TOKENS: z.coerce.number().default(1024),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ RAG config error:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
```

---

## 📄 Ingest Layer

### `ingest/loader.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';

export async function loadFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (['.txt', '.md', '.html'].includes(ext)) {
    return fs.readFile(filePath, 'utf-8');
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
```

### `ingest/chunker.ts`

```typescript
export interface Chunk {
  text: string;
  index: number;
  source: string;
}

export function chunkText(
  text: string,
  source: string,
  chunkSize = 400,
  overlap = 60
): Chunk[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text];
  const chunks: Chunk[] = [];
  let buffer = '';
  let index = 0;

  for (const sentence of sentences) {
    buffer += sentence;
    if (buffer.split(' ').length >= chunkSize) {
      chunks.push({ text: buffer.trim(), index: index++, source });
      // Keep last `overlap` words for continuity
      buffer = buffer.split(' ').slice(-overlap).join(' ');
    }
  }

  if (buffer.trim()) {
    chunks.push({ text: buffer.trim(), index: index++, source });
  }

  return chunks;
}
```

### `ingest/embedder.ts`

```typescript
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { config } from '../config';

let _embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!_embedder) {
    _embedder = await pipeline('feature-extraction', config.EMBEDDING_MODEL);
  }
  return _embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(embedText));
}
```

---

## 🗃️ Vector Store (Pinecone)

### `retrieval/vectorStore.ts`

```typescript
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config';
import { Chunk } from '../ingest/chunker';
import { embedBatch, embedText } from '../ingest/embedder';

const pc = new Pinecone({ apiKey: config.PINECONE_API_KEY });
const index = pc.index(config.PINECONE_INDEX);

export async function upsertChunks(chunks: Chunk[]): Promise<void> {
  const embeddings = await embedBatch(chunks.map((c) => c.text));

  const vectors = chunks.map((chunk, i) => ({
    id: `${chunk.source}_${chunk.index}`,
    values: embeddings[i],
    metadata: { text: chunk.text, source: chunk.source, index: chunk.index },
  }));

  // Pinecone recommends batches of 100
  for (let i = 0; i < vectors.length; i += 100) {
    await index.upsert(vectors.slice(i, i + 100));
  }

  console.log(`✅ Upserted ${vectors.length} chunks to Pinecone`);
}

export async function searchSimilar(query: string, topK = config.TOP_K): Promise<string[]> {
  const queryEmbedding = await embedText(query);

  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  return results.matches
    .filter((m) => m.score && m.score > 0.5) // filter low-confidence matches
    .map((m) => m.metadata?.text as string)
    .filter(Boolean);
}
```

---

## 🤖 LLM Layer (Anthropic)

### `generation/prompts.ts`

```typescript
export const SYSTEM_PROMPT = `You are a knowledgeable assistant with access to a curated knowledge base.

Rules:
1. Answer using ONLY the information in the provided context.
2. If the context does not contain enough information, say "I don't have enough information to answer that."
3. Never fabricate facts, citations, or statistics.
4. Be concise and direct. Avoid unnecessary preamble.
5. If the user asks a follow-up, use the conversation history to maintain continuity.`;

export function buildUserMessage(query: string, contextChunks: string[]): string {
  const context = contextChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n');
  return `Context:\n${context}\n\nQuestion: ${query}`;
}
```

### `generation/llm.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { SYSTEM_PROMPT, buildUserMessage } from './prompts';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export async function generate(
  query: string,
  contextChunks: string[],
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  const userMessage = buildUserMessage(query, contextChunks);

  const response = await client.messages.create({
    model: config.LLM_MODEL,
    max_tokens: config.LLM_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      ...history,
      { role: 'user', content: userMessage },
    ],
  });

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

export async function* generateStream(
  query: string,
  contextChunks: string[]
): AsyncGenerator<string> {
  const userMessage = buildUserMessage(query, contextChunks);

  const stream = await client.messages.stream({
    model: config.LLM_MODEL,
    max_tokens: config.LLM_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text;
    }
  }
}
```

---

## 🔗 Pipeline — Main Export

```typescript
// pipeline.ts — this is what the BullMQ worker imports
import { searchSimilar } from './retrieval/vectorStore';
import { generate } from './generation/llm';

export interface PipelineOptions {
  topK?: number;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export async function runRagPipeline(
  query: string,
  options: PipelineOptions = {}
): Promise<string> {
  const { topK, history = [] } = options;

  // 1. Retrieve relevant chunks
  const chunks = await searchSimilar(query, topK);

  if (chunks.length === 0) {
    return "I couldn't find relevant information in the knowledge base to answer that.";
  }

  // 2. Generate grounded answer
  return generate(query, chunks, history);
}
```

---

## 📥 Ingest Script (run once per document batch)

```typescript
// scripts/ingest.ts
import { loadFile } from './src/ingest/loader';
import { chunkText } from './src/ingest/chunker';
import { upsertChunks } from './src/retrieval/vectorStore';
import path from 'path';

async function ingest(filePath: string) {
  console.log(`📄 Loading: ${filePath}`);
  const text = await loadFile(filePath);

  const source = path.basename(filePath);
  const chunks = chunkText(text, source);
  console.log(`✂️  ${chunks.length} chunks created`);

  await upsertChunks(chunks);
  console.log('✅ Ingest complete');
}

// CLI: npx ts-node scripts/ingest.ts ./docs/manual.pdf
ingest(process.argv[2]);
```

---

## 🌊 Streaming via Express (optional endpoint)

```typescript
// In backend routes/ask.ts — add a streaming variant
askRouter.post('/stream', authGuard, async (req, res, next) => {
  try {
    const { query } = AskSchema.parse(req.body);
    const chunks = await searchSimilar(query);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const token of generateStream(query, chunks)) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    next(err);
  }
});
```

---

## ✅ Checklist Before Shipping

- [ ] Pinecone index created with correct dimension (384 for MiniLM, 1536 for OpenAI)
- [ ] Ingest script run and verified with a test query
- [ ] `searchSimilar` similarity threshold tuned (start at 0.5)
- [ ] System prompt explicitly forbids hallucination
- [ ] `runRagPipeline` handles empty retrieval gracefully
- [ ] Streaming endpoint tested with a real client
- [ ] `ANTHROPIC_API_KEY` and `PINECONE_API_KEY` in `.env`, never committed
- [ ] LLM model string matches a current Anthropic model

---

## 🚨 Common RAG Failure Modes

| ❌ Problem                       | ✅ Fix                                                       |
|----------------------------------|--------------------------------------------------------------|
| LLM ignores retrieved context    | Put numbered context blocks BEFORE the question             |
| Poor retrieval quality           | Lower similarity threshold, increase `topK`, improve chunks |
| Chunks cut mid-sentence          | Use sentence-aware splitter (already in chunker.ts above)   |
| Embedder cold start is slow      | Warm up embedder at server start, not on first request      |
| LLM hallucinates despite context | Lower temperature (add `temperature: 0.2` to API call)      |
| Stale knowledge base             | Re-run ingest script on document updates                    |
