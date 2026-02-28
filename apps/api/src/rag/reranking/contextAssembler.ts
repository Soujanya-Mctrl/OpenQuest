/**
 * contextAssembler.ts
 * apps/api/src/rag/retrieval/contextAssembler.ts
 *
 * Takes retrieved chunks and assembles them into a structured prompt
 * for the Gemini LLM to answer the user's question.
 *
 * Design principles:
 *   - Grounding only: the LLM is instructed to answer ONLY from provided context
 *   - Chunks are presented with file path + line numbers so answers cite sources
 *   - Chunks from the same file are grouped together for readability
 *   - Token budget is respected — we trim context if it gets too large
 */

import type { RetrievedChunk } from "../retrieval/retriever";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssembledContext {
  systemPrompt: string;
  userPrompt: string;
  citationMap: CitationMap;   // So the API can return structured citations
  tokenEstimate: number;
}

export interface Citation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string | null;
}

export type CitationMap = Record<string, Citation>; // key = "[1]", "[2]", etc.

// ─── Constants ────────────────────────────────────────────────────────────────

// Rough token budget for context (leaves room for question + response)
// Gemini 1.5 Flash has 1M context window but we keep chunks tight
const MAX_CONTEXT_CHARS = 12000; // ~3000 tokens

// ─── Entry Point ─────────────────────────────────────────────────────────────

export function assembleContext(
  query: string,
  chunks: RetrievedChunk[],
  repoId: string
): AssembledContext {
  // Group chunks by file for cleaner presentation
  const grouped = groupByFile(chunks);

  // Build context blocks with citation markers
  const citationMap: CitationMap = {};
  const contextBlocks: string[] = [];
  let citationIndex = 1;
  let totalChars = 0;

  for (const [filePath, fileChunks] of Object.entries(grouped)) {
    const fileBlock: string[] = [`### File: \`${filePath}\``];

    for (const chunk of fileChunks) {
      // Enforce token budget — stop adding chunks if we're over limit
      if (totalChars > MAX_CONTEXT_CHARS) break;

      const citationKey = `[${citationIndex}]`;
      citationMap[citationKey] = {
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        symbolName: chunk.symbolName,
      };

      const chunkHeader = chunk.symbolName
        ? `${citationKey} \`${chunk.symbolName}\` (lines ${chunk.startLine}–${chunk.endLine})`
        : `${citationKey} lines ${chunk.startLine}–${chunk.endLine}`;

      const chunkBlock = `${chunkHeader}\n\`\`\`${chunk.language}\n${chunk.content}\n\`\`\``;

      fileBlock.push(chunkBlock);
      totalChars += chunkBlock.length;
      citationIndex++;
    }

    contextBlocks.push(fileBlock.join("\n\n"));
  }

  const contextSection = contextBlocks.join("\n\n---\n\n");

  const systemPrompt = buildSystemPrompt(repoId);
  const userPrompt = buildUserPrompt(query, contextSection);

  return {
    systemPrompt,
    userPrompt,
    citationMap,
    tokenEstimate: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
  };
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(repoId: string): string {
  return `You are a code intelligence assistant for the repository \`${repoId}\`.

Your job is to answer developer questions about this codebase accurately and concisely.

RULES:
1. Answer ONLY using the code context provided below. Do not use outside knowledge.
2. Always cite your sources using the [N] citation markers provided.
3. Include exact file paths and line numbers in your answer.
4. If the context does not contain enough information to answer, say so clearly — do not guess.
5. Format code references using backticks.
6. Keep answers concise. Developers want facts, not essays.`;
}

function buildUserPrompt(query: string, contextSection: string): string {
  return `## Codebase Context

${contextSection}

---

## Question

${query}

## Answer (cite sources with [N] markers)`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByFile(
  chunks: RetrievedChunk[]
): Record<string, RetrievedChunk[]> {
  const grouped: Record<string, RetrievedChunk[]> = {};

  for (const chunk of chunks) {
    if (!grouped[chunk.filePath]) {
      grouped[chunk.filePath] = [];
    }
    grouped[chunk.filePath].push(chunk);
  }

  // Sort chunks within each file by line number
  for (const filePath of Object.keys(grouped)) {
    grouped[filePath].sort((a, b) => a.startLine - b.startLine);
  }

  return grouped;
}