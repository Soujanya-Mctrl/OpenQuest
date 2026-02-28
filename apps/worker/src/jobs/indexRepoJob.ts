/**
 * indexRepoJob.ts  (apps/worker/src/jobs/)
 *
 * BullMQ worker job that runs the complete RAG ingestion pipeline:
 *   1. Fetch latest commit hash → check if reindex needed
 *   2. Run ingestion pipeline (fetch → filter → chunk)
 *   3. Embed chunks (Gemini / Xenova)
 *   4. Write to pgvector (commit-hash versioned)
 *
 * This job is triggered when a user pastes a GitHub URL.
 * The API responds immediately; this job runs in the background.
 *
 * Queue name: "index-repo"
 */

import { Worker, Job, Queue } from "bullmq";
import IORedis from "ioredis";
import { runIngestionPipeline } from "../../../api/src/rag/ingestion/ingestionPipeline";
import { embedChunks } from "../../../api/src/rag/embeddings/embeddingEngine";
import {
    writeToVectorStore,
    fetchLatestCommitHash,
} from "../../../api/src/rag/vectorstore/vectorStoreWriter";
import { parseGitHubUrl } from "../../../api/src/rag/ingestion/githubFetcher";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IndexRepoJobData {
    githubUrl: string;
    githubToken?: string;  // User's OAuth token (optional, increases rate limits)
    requestedBy?: string;  // User ID who triggered indexing (for logging)
}

export interface IndexRepoJobResult {
    repoId: string;
    strategy: "skipped" | "full-reindex" | "upsert";
    chunksWritten: number;
    totalDurationMs: number;
}

// ─── Queue Definition ─────────────────────────────────────────────────────────

export const QUEUE_NAME = "index-repo";

export function createIndexRepoQueue(redis: IORedis): Queue<IndexRepoJobData> {
    return new Queue<IndexRepoJobData>(QUEUE_NAME, {
        connection: redis as any,
        defaultJobOptions: {
            attempts: 3,                  // Retry up to 3 times on failure
            backoff: { type: "exponential", delay: 5000 }, // 5s, 10s, 20s backoff
            removeOnComplete: { count: 100 },  // Keep last 100 completed jobs for debugging
            removeOnFail: { count: 50 },
        },
    });
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export function startIndexRepoWorker(redis: IORedis): Worker<IndexRepoJobData, IndexRepoJobResult> {
    const worker = new Worker<IndexRepoJobData, IndexRepoJobResult>(
        QUEUE_NAME,
        async (job: Job<IndexRepoJobData>) => {
            return await processIndexRepoJob(job);
        },
        {
            connection: redis as any,
            concurrency: 3,  // Process up to 3 repos simultaneously
        }
    );

    worker.on("completed", (job, result) => {
        console.log(
            `[Worker] ✅ Job ${job.id} completed for ${result.repoId} ` +
            `(${result.strategy}, ${result.chunksWritten} chunks, ${result.totalDurationMs}ms)`
        );
    });

    worker.on("failed", (job, err) => {
        console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message);
    });

    worker.on("progress", (job, progress) => {
        console.log(`[Worker] Job ${job.id} progress: ${progress}%`);
    });

    console.log(`[Worker] 🚀 index-repo worker started (concurrency: 3)`);
    return worker;
}

// ─── Job Processor ────────────────────────────────────────────────────────────

async function processIndexRepoJob(
    job: Job<IndexRepoJobData>
): Promise<IndexRepoJobResult> {
    const { githubUrl, githubToken, requestedBy } = job.data;
    const startTime = Date.now();

    console.log(
        `\n[Worker] Starting index job for: ${githubUrl}` +
        (requestedBy ? ` (requested by: ${requestedBy})` : "")
    );

    // ── Phase 1: Commit Hash Check (fast, before any heavy work) ────────────────
    await job.updateProgress(5);

    const { owner, repo } = parseGitHubUrl(githubUrl);

    // We need the default branch — do a lightweight repo fetch first
    const { Octokit } = await import("@octokit/rest");
    const octokit = new Octokit({ auth: githubToken || process.env.GITHUB_TOKEN });
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const commitHash = await fetchLatestCommitHash(owner, repo, defaultBranch, githubToken);

    // ── Phase 2: Ingestion (fetch → filter → chunk) ──────────────────────────────
    await job.updateProgress(10);
    console.log(`[Worker] Phase 2/4: Running ingestion pipeline...`);

    const ingestionResult = await runIngestionPipeline({ githubUrl, githubToken });
    await job.updateProgress(40);

    if (ingestionResult.chunks.length === 0) {
        console.warn(`[Worker] No chunks produced for ${githubUrl}. Aborting.`);
        return {
            repoId: ingestionResult.repoId,
            strategy: "skipped",
            chunksWritten: 0,
            totalDurationMs: Date.now() - startTime,
        };
    }

    // ── Phase 3: Embedding ──────────────────────────────────────────────────────
    console.log(`[Worker] Phase 3/4: Embedding ${ingestionResult.chunks.length} chunks...`);
    const embeddingResult = await embedChunks(ingestionResult.chunks);
    await job.updateProgress(80);

    // ── Phase 4: Write to pgvector ──────────────────────────────────────────────
    console.log(`[Worker] Phase 4/4: Writing to vector store...`);
    const writeResult = await writeToVectorStore(embeddingResult.embedded, {
        repoMeta: {
            owner,
            repo,
            defaultBranch,
            sizeKB: repoData.size,
            fileCount: ingestionResult.stats.filesAccepted,
            usedFallback: ingestionResult.stats.usedCloneFallback,
        },
        commitHash: commitHash ?? undefined,
        embeddingModel: embeddingResult.model,
    });

    await job.updateProgress(100);

    const totalDurationMs = Date.now() - startTime;

    console.log(
        `\n[Worker] 🎉 Pipeline complete for ${ingestionResult.repoId}:\n` +
        `  Strategy:      ${writeResult.strategy}\n` +
        `  Chunks written: ${writeResult.chunksWritten}\n` +
        `  Total time:    ${totalDurationMs}ms`
    );

    return {
        repoId: ingestionResult.repoId,
        strategy: writeResult.strategy,
        chunksWritten: writeResult.chunksWritten,
        totalDurationMs,
    };
}