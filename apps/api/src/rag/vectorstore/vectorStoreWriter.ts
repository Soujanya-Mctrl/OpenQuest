import { PrismaClient } from "@prisma/client";
import type { EmbeddedChunk } from "../embeddings/embeddingEngine"; // IDE cache bust 2
import type { RepoMeta } from "../ingestion/githubFetcher";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WriteOptions {
  repoMeta: RepoMeta;
  commitHash?: string;       // Latest commit SHA fetched before indexing
  embeddingModel: string;    // e.g. "text-embedding-004"
}

export interface WriteResult {
  repoId: string;
  strategy: "skipped" | "full-reindex" | "upsert";
  chunksWritten: number;
  chunksDeleted: number;
  durationMs: number;
}

// ─── Singleton Prisma Client ──────────────────────────────────────────────────

let prisma: PrismaClient;

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function writeToVectorStore(
  embedded: EmbeddedChunk[],
  options: WriteOptions
): Promise<WriteResult> {
  const startTime = Date.now();
  const db = getPrisma();
  const repoId = `${options.repoMeta.owner}/${options.repoMeta.repo}`;

  console.log(`\n[VectorStore] Writing ${embedded.length} chunks for ${repoId}`);

  // ── Commit Hash Check ──────────────────────────────────────────────────────
  if (options.commitHash) {
    const existing = await db.repoIndex.findUnique({ where: { repoId } });

    if (existing?.commitHash === options.commitHash) {
      const durationMs = Date.now() - startTime;
      console.log(
        `[VectorStore] ⏭️  Skipping ${repoId} — already indexed at commit ${options.commitHash.slice(0, 7)}`
      );
      return {
        repoId,
        strategy: "skipped",
        chunksWritten: 0,
        chunksDeleted: 0,
        durationMs,
      };
    }

    // Commit changed (or first time) → full reindex
    console.log(
      `[VectorStore] New commit detected (${options.commitHash.slice(0, 7)}). Full reindex.`
    );
    return await fullReindex(db, repoId, embedded, options, startTime);
  }

  // ── No Commit Hash → Upsert Fallback ──────────────────────────────────────
  console.log(`[VectorStore] No commit hash available. Using upsert fallback.`);
  return await upsertChunks(db, repoId, embedded, options, startTime);
}

// ─── Strategy A: Full Reindex ─────────────────────────────────────────────────

async function fullReindex(
  db: PrismaClient,
  repoId: string,
  embedded: EmbeddedChunk[],
  options: WriteOptions,
  startTime: number
): Promise<WriteResult> {
  let chunksDeleted = 0;

  // Delete all existing chunks for this repo (cascade from RepoIndex)
  const existing = await db.repoIndex.findUnique({ where: { repoId } });
  if (existing) {
    const deleteResult = await db.codeChunk.deleteMany({ where: { repoId } });
    chunksDeleted = deleteResult.count;
    console.log(`[VectorStore] Deleted ${chunksDeleted} old chunks for ${repoId}`);
  }

  // Insert all fresh chunks in batches
  const chunksWritten = await batchInsertChunks(db, embedded);

  // Upsert the RepoIndex record with new commit hash
  await db.repoIndex.upsert({
    where: { repoId },
    create: {
      repoId,
      commitHash: options.commitHash ?? null,
      defaultBranch: options.repoMeta.defaultBranch,
      sizeKB: options.repoMeta.sizeKB,
      fileCount: options.repoMeta.fileCount,
      chunkCount: chunksWritten,
      embeddingModel: options.embeddingModel,
    },
    update: {
      commitHash: options.commitHash ?? null,
      sizeKB: options.repoMeta.sizeKB,
      fileCount: options.repoMeta.fileCount,
      chunkCount: chunksWritten,
      embeddingModel: options.embeddingModel,
      updatedAt: new Date(),
    },
  });

  const durationMs = Date.now() - startTime;
  console.log(`[VectorStore] ✅ Full reindex complete: ${chunksWritten} chunks written in ${durationMs}ms`);

  return { repoId, strategy: "full-reindex", chunksWritten, chunksDeleted, durationMs };
}

// ─── Strategy B: Upsert Fallback ─────────────────────────────────────────────

async function upsertChunks(
  db: PrismaClient,
  repoId: string,
  embedded: EmbeddedChunk[],
  options: WriteOptions,
  startTime: number
): Promise<WriteResult> {
  // For upsert we use raw SQL because Prisma doesn't support
  // ON CONFLICT DO UPDATE with vector columns natively
  const chunksWritten = await batchInsertChunks(db, embedded, true);

  await db.repoIndex.upsert({
    where: { repoId },
    create: {
      repoId,
      commitHash: null,
      defaultBranch: options.repoMeta.defaultBranch,
      sizeKB: options.repoMeta.sizeKB,
      fileCount: options.repoMeta.fileCount,
      chunkCount: chunksWritten,
      embeddingModel: options.embeddingModel,
    },
    update: {
      chunkCount: chunksWritten,
      embeddingModel: options.embeddingModel,
      updatedAt: new Date(),
    },
  });

  const durationMs = Date.now() - startTime;
  console.log(`[VectorStore] ✅ Upsert complete: ${chunksWritten} chunks in ${durationMs}ms`);

  return { repoId, strategy: "upsert", chunksWritten, chunksDeleted: 0, durationMs };
}

// ─── Batch Insert (Raw SQL for vector support) ────────────────────────────────

const INSERT_BATCH_SIZE = 50; // Insert 50 chunks per SQL statement

/**
 * Inserts chunks using raw SQL because Prisma doesn't support
 * writing to `vector` columns via its standard client.
 * pgvector expects the vector as a string: '[0.1, 0.2, ...]'
 */
async function batchInsertChunks(
  db: PrismaClient,
  embedded: EmbeddedChunk[],
  upsert = false
): Promise<number> {
  let totalInserted = 0;

  for (let i = 0; i < embedded.length; i += INSERT_BATCH_SIZE) {
    const batch = embedded.slice(i, i + INSERT_BATCH_SIZE);

    // Build VALUES clause for batch insert
    const values = batch.map((e, idx) => {
      const base = i + idx;
      return `($${base * 11 + 1}, $${base * 11 + 2}, $${base * 11 + 3}, $${base * 11 + 4}, $${base * 11 + 5}, $${base * 11 + 6}, $${base * 11 + 7}, $${base * 11 + 8}, $${base * 11 + 9}, $${base * 11 + 10}::vector, $${base * 11 + 11})`;
    });

    const params = batch.flatMap((e) => [
      e.chunk.id,
      e.chunk.repoId,
      e.chunk.filePath,
      e.chunk.language,
      e.chunk.content,
      e.chunk.startLine,
      e.chunk.endLine,
      e.chunk.symbolName ?? null,
      e.chunk.chunkIndex,
      `[${e.embedding.join(",")}]`,  // pgvector string format
      e.embeddedAt,
    ]);

    const conflictClause = upsert
      ? `ON CONFLICT (id) DO UPDATE SET
           content    = EXCLUDED.content,
           embedding  = EXCLUDED.embedding,
           embedded_at = EXCLUDED.embedded_at`
      : `ON CONFLICT (id) DO NOTHING`;

    await db.$executeRawUnsafe(
      `INSERT INTO code_chunks
         (id, repo_id, file_path, language, content, start_line, end_line, symbol_name, chunk_index, embedding, embedded_at)
       VALUES ${values.join(", ")}
       ${conflictClause}`,
      ...params
    );

    totalInserted += batch.length;
    console.log(
      `[VectorStore] Inserted batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}/${Math.ceil(embedded.length / INSERT_BATCH_SIZE)}`
    );
  }

  return totalInserted;
}

// ─── Commit Hash Fetcher ──────────────────────────────────────────────────────

/**
 * Fetches the latest commit SHA for a repo's default branch.
 * Called before the ingestion pipeline starts so we can decide
 * whether to skip or reindex.
 */
export async function fetchLatestCommitHash(
  owner: string,
  repo: string,
  defaultBranch: string,
  githubToken?: string
): Promise<string | null> {
  try {
    const { Octokit } = await import("@octokit/rest");
    const octokit = new Octokit({ auth: githubToken || process.env.GITHUB_TOKEN });

    const { data } = await octokit.repos.getBranch({ owner, repo, branch: defaultBranch });
    return data.commit.sha;
  } catch (err) {
    console.warn(`[VectorStore] Could not fetch commit hash for ${owner}/${repo}:`, err);
    return null;
  }
}