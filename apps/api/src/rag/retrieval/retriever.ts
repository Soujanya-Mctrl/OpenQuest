/**
 * retriever.ts
 * apps/api/src/rag/retrieval/retriever.ts
 *
 * Retrieves the most relevant CodeChunks for a given query.
 *
 * Pipeline:
 *   1. Embed the query using the same Gemini model used at index time
 *   2. Run pgvector cosine similarity search (top-K * 3 candidates)
 *   3. Rerank by file proximity — boost chunks from files already in results
 *   4. Return final top-K chunks with scores, ready for prompt assembly
 */

import { PrismaClient } from "@prisma/client";
import { GEMINI_EMBEDDING_DIM, embedQuery } from "../embeddings/queryEmbedder"; // IDE cache bust

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetrievalOptions {
    repoId: string;         // "owner/repo" — scope search to one repo
    topK?: number;          // Final number of chunks to return (default: 8)
    candidateMultiplier?: number; // Fetch topK * this before reranking (default: 3)
    minScore?: number;      // Discard chunks below this cosine similarity (default: 0.3)
    fileFilter?: string[];  // Optional: only search within these file paths
}

export interface RetrievedChunk {
    id: string;
    filePath: string;
    language: string;
    content: string;
    startLine: number;
    endLine: number;
    symbolName?: string | null;
    score: number;          // Final score after reranking (0–1)
    vectorScore: number;    // Raw cosine similarity from pgvector
    proximityBoost: number; // How much the reranker added
}

export interface RetrievalResult {
    query: string;
    repoId: string;
    chunks: RetrievedChunk[];
    totalCandidates: number;  // How many chunks were fetched before reranking
    durationMs: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TOP_K = 8;
const DEFAULT_CANDIDATE_MULTIPLIER = 3;
const DEFAULT_MIN_SCORE = 0.3;

// File proximity boost: if a file already has a chunk in top results,
// other chunks from that file get this additive score bonus
const PROXIMITY_BOOST = 0.08;

// Cap proximity boost per file so one giant file can't dominate results
const MAX_PROXIMITY_BOOST_PER_FILE = 0.16; // i.e. max 2 boosted chunks per file

// ─── Singleton Prisma Client ──────────────────────────────────────────────────

let prisma: PrismaClient;
function getPrisma(): PrismaClient {
    if (!prisma) prisma = new PrismaClient();
    return prisma;
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function retrieve(
    query: string,
    options: RetrievalOptions
): Promise<RetrievalResult> {
    const startTime = Date.now();
    const topK = options.topK ?? DEFAULT_TOP_K;
    const candidateCount = topK * (options.candidateMultiplier ?? DEFAULT_CANDIDATE_MULTIPLIER);
    const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

    console.log(
        `[Retriever] Query: "${query.slice(0, 80)}..." | repo: ${options.repoId} | topK: ${topK}`
    );

    // ── Step 1: Embed the query ────────────────────────────────────────────────
    const queryVector = await embedQuery(query);

    // ── Step 2: Vector similarity search ──────────────────────────────────────
    const candidates = await vectorSearch(
        queryVector,
        options.repoId,
        candidateCount,
        minScore,
        options.fileFilter
    );

    console.log(`[Retriever] Vector search returned ${candidates.length} candidates`);

    // ── Step 3: Rerank by file proximity ──────────────────────────────────────
    const reranked = rerankByFileProximity(candidates, topK);

    const durationMs = Date.now() - startTime;

    console.log(
        `[Retriever] ✅ Returning ${reranked.length} chunks after reranking (${durationMs}ms)`
    );

    return {
        query,
        repoId: options.repoId,
        chunks: reranked,
        totalCandidates: candidates.length,
        durationMs,
    };
}

// ─── Vector Search ────────────────────────────────────────────────────────────

interface RawCandidate {
    id: string;
    filePath: string;
    language: string;
    content: string;
    startLine: number;
    endLine: number;
    symbolName: string | null;
    vectorScore: number;
}

async function vectorSearch(
    queryVector: number[],
    repoId: string,
    limit: number,
    minScore: number,
    fileFilter?: string[]
): Promise<RawCandidate[]> {
    const db = getPrisma();

    // Format vector as pgvector string: '[0.1, 0.2, ...]'
    const vectorStr = `[${queryVector.join(",")}]`;

    // Build optional file filter clause
    const fileFilterClause =
        fileFilter && fileFilter.length > 0
            ? `AND file_path = ANY(ARRAY[${fileFilter.map((_, i) => `$${i + 3}`).join(",")}])`
            : "";

    const fileFilterParams = fileFilter ?? [];

    // Raw SQL — Prisma can't handle vector operators (<=>  = cosine distance)
    // 1 - (embedding <=> query) converts distance to similarity score (0–1)
    const rows = await db.$queryRawUnsafe<RawCandidate[]>(
        `
    SELECT
      id,
      file_path        AS "filePath",
      language,
      content,
      start_line       AS "startLine",
      end_line         AS "endLine",
      symbol_name      AS "symbolName",
      1 - (embedding <=> $1::vector) AS "vectorScore"
    FROM code_chunks
    WHERE
      repo_id = $2
      AND 1 - (embedding <=> $1::vector) >= ${minScore}
      ${fileFilterClause}
    ORDER BY embedding <=> $1::vector   -- ASC = closest first
    LIMIT ${limit}
    `,
        vectorStr,
        repoId,
        ...fileFilterParams
    );

    return rows;
}

// ─── File Proximity Reranker ──────────────────────────────────────────────────

/**
 * Reranks candidates using a two-pass approach:
 *
 * Pass 1 — Identify "anchor files":
 *   The top-N chunks by raw vector score determine which files are "hot".
 *   We use the top 3 chunks as anchors.
 *
 * Pass 2 — Boost + sort:
 *   Any candidate from an anchor file gets a proximity boost added to its score.
 *   Boost is capped per file to prevent one large file dominating.
 *   Final sort is by boosted score descending, then take top-K.
 */
function rerankByFileProximity(
    candidates: RawCandidate[],
    topK: number
): RetrievedChunk[] {
    if (candidates.length === 0) return [];

    const ANCHOR_COUNT = Math.min(3, candidates.length);

    // Pass 1: collect anchor files from top-N by vector score
    const anchorFiles = new Set(
        candidates.slice(0, ANCHOR_COUNT).map((c) => c.filePath)
    );

    // Track how much boost has been applied per file (cap enforcement)
    const boostApplied = new Map<string, number>();

    // Pass 2: compute final scores
    const scored: RetrievedChunk[] = candidates.map((candidate) => {
        let proximityBoost = 0;

        if (anchorFiles.has(candidate.filePath)) {
            const alreadyBoosted = boostApplied.get(candidate.filePath) ?? 0;

            if (alreadyBoosted < MAX_PROXIMITY_BOOST_PER_FILE) {
                proximityBoost = Math.min(
                    PROXIMITY_BOOST,
                    MAX_PROXIMITY_BOOST_PER_FILE - alreadyBoosted
                );
                boostApplied.set(candidate.filePath, alreadyBoosted + proximityBoost);
            }
        }

        return {
            id: candidate.id,
            filePath: candidate.filePath,
            language: candidate.language,
            content: candidate.content,
            startLine: candidate.startLine,
            endLine: candidate.endLine,
            symbolName: candidate.symbolName,
            vectorScore: candidate.vectorScore,
            proximityBoost,
            score: candidate.vectorScore + proximityBoost,
        };
    });

    // Sort by final score descending, take topK
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}