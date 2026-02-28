/**
 * ragQuery.route.ts
 * apps/api/src/routes/ragQuery.route.ts
 *
 * POST /api/rag/query
 * The single endpoint the frontend calls when a user asks a question
 * about a codebase e.g. "Where is authentication handled?"
 *
 * Flow:
 *   1. Validate request
 *   2. Retrieve relevant chunks from pgvector
 *   3. Assemble context + prompt
 *   4. Call Gemini LLM
 *   5. Return answer + citations
 */

import { Router, Request, Response } from "express";
import { retrieve } from "../rag/retrieval/retriever";
import { assembleContext } from "../rag/reranking/contextAssembler";

export function createRagQueryRouter(): Router {
  const router = Router();

  /**
   * POST /api/rag/query
   * Body: { repoId: string, query: string, topK?: number }
   */
  router.post("/query", async (req: Request, res: Response) => {
    const { repoId, query, topK } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!repoId || typeof repoId !== "string") {
      return res.status(400).json({ error: "repoId is required (e.g. 'owner/repo')" });
    }
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return res.status(400).json({ error: "query must be at least 3 characters" });
    }

    try {
      // ── Step 1: Retrieve ───────────────────────────────────────────────────
      const retrievalResult = await retrieve(query.trim(), {
        repoId,
        topK: topK ?? 8,
      });

      if (retrievalResult.chunks.length === 0) {
        return res.status(200).json({
          answer: "No relevant code was found for this query. The repository may not be indexed yet, or the question may be outside the scope of the codebase.",
          citations: {},
          chunks: [],
          repoId,
          query,
        });
      }

      // ── Step 2: Assemble context + prompt ──────────────────────────────────
      const { systemPrompt, userPrompt, citationMap, tokenEstimate } =
        assembleContext(query, retrievalResult.chunks, repoId);

      console.log(
        `[RAG] Calling LLM with ~${tokenEstimate} tokens for query: "${query.slice(0, 60)}..."`
      );

      // ── Step 3: Call Gemini LLM ────────────────────────────────────────────
      const answer = await callGemini(systemPrompt, userPrompt);

      // ── Step 4: Return structured response ────────────────────────────────
      return res.status(200).json({
        answer,
        citations: citationMap,
        chunks: retrievalResult.chunks.map((c) => ({
          filePath: c.filePath,
          startLine: c.startLine,
          endLine: c.endLine,
          symbolName: c.symbolName,
          score: parseFloat(c.score.toFixed(4)),
          language: c.language,
        })),
        meta: {
          repoId,
          query,
          totalCandidates: retrievalResult.totalCandidates,
          chunksUsed: retrievalResult.chunks.length,
          retrievalMs: retrievalResult.durationMs,
        },
      });
    } catch (err: any) {
      console.error("[RAG] Query error:", err);
      return res.status(500).json({ error: "RAG query failed", detail: err.message });
    }
  });

  return router;
}

// ─── Gemini LLM Call ──────────────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,      // Low temp = factual, grounded answers
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini LLM error ${response.status}: ${error}`);
  }

  const data = await response.json() as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> };
    }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated.";
}