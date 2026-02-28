import { fetchRepository, type FetchResult } from "./githubFetcher";
import { filterFiles, type FilterResult } from "./fileFilter";
import { chunkFiles, type CodeChunk } from "./astChunker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngestionInput {
  githubUrl: string;
  githubToken?: string; // Optional: increases GitHub API rate limit from 60 to 5000 req/hr
}

export interface IngestionOutput {
  repoId: string;          // "owner/repo"
  chunks: CodeChunk[];     // Ready for embedding
  stats: IngestionStats;
}

export interface IngestionStats {
  totalFilesFound: number;
  filesAccepted: number;
  filesRejected: number;
  totalChunks: number;
  usedCloneFallback: boolean;
  durationMs: number;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function runIngestionPipeline(
  input: IngestionInput
): Promise<IngestionOutput> {
  const startTime = Date.now();
  console.log(`\n[Pipeline] Starting ingestion for: ${input.githubUrl}`);

  // ── Step 1: Fetch ──────────────────────────────────────────────────────────
  console.log(`[Pipeline] Step 1/3: Fetching repository...`);
  const fetchResult: FetchResult = await fetchRepository(
    input.githubUrl,
    input.githubToken
  );
  const repoId = `${fetchResult.meta.owner}/${fetchResult.meta.repo}`;
  console.log(
    `[Pipeline] Fetched ${fetchResult.files.length} files from ${repoId}`
  );

  // ── Step 2: Filter ─────────────────────────────────────────────────────────
  console.log(`[Pipeline] Step 2/3: Filtering files...`);
  const filterResult: FilterResult = filterFiles(fetchResult.files);
  console.log(
    `[Pipeline] Filter complete: ${filterResult.accepted.length} accepted, ` +
      `${filterResult.rejected.length} rejected`
  );

  // ── Step 3: Chunk ──────────────────────────────────────────────────────────
  console.log(`[Pipeline] Step 3/3: Chunking files...`);
  const chunks: CodeChunk[] = chunkFiles(repoId, filterResult.accepted);

  const durationMs = Date.now() - startTime;

  const stats: IngestionStats = {
    totalFilesFound: fetchResult.files.length,
    filesAccepted: filterResult.accepted.length,
    filesRejected: filterResult.rejected.length,
    totalChunks: chunks.length,
    usedCloneFallback: fetchResult.meta.usedFallback,
    durationMs,
  };

  console.log(`\n[Pipeline] ✅ Ingestion complete for ${repoId}`);
  console.log(`[Pipeline] Stats:`, stats);

  return { repoId, chunks, stats };
}