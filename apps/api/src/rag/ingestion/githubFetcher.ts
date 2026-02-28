import { Octokit } from "@octokit/rest";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import fs from "fs";
import os from "os";
import path from "path";
import { SUPPORTED_EXTENSIONS, IGNORED_PATHS } from "./fileFilter";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILE_COUNT_THRESHOLD = 1000; // Switch to clone if repo has > 1000 files
const SIZE_THRESHOLD_MB = 50;      // Switch to clone if repo > 50MB
const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB per file hard cap

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawFile {
  path: string;       // Relative path within the repo e.g. "src/auth/login.ts"
  content: string;    // Raw UTF-8 file content
  sizeBytes: number;
}

export interface RepoMeta {
  owner: string;
  repo: string;
  defaultBranch: string;
  sizeKB: number;
  fileCount: number;
  usedFallback: boolean; // Whether clone fallback was triggered
}

export interface FetchResult {
  files: RawFile[];
  meta: RepoMeta;
}

// ─── URL Parser ───────────────────────────────────────────────────────────────

export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const cleaned = url.replace(/\.git$/, "").replace(/\/tree\/.*$/, "");
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return { owner: match[1], repo: match[2] };
}

// ─── Main Fetcher ─────────────────────────────────────────────────────────────

export async function fetchRepository(
  githubUrl: string,
  githubToken?: string
): Promise<FetchResult> {
  const { owner, repo } = parseGitHubUrl(githubUrl);

  const octokit = new Octokit({
    auth: githubToken || process.env.GITHUB_TOKEN,
  });

  // 1. Fetch repo metadata to decide strategy
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const sizeKB = repoData.size; // GitHub returns size in KB
  const defaultBranch = repoData.default_branch;

  // 2. Fetch the full file tree (recursive)
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "1",
  });

  const allFiles = (treeData.tree || []).filter((item) => item.type === "blob");
  const fileCount = allFiles.length;

  const meta: RepoMeta = {
    owner,
    repo,
    defaultBranch,
    sizeKB,
    fileCount,
    usedFallback: false,
  };

  // 3. Decide strategy based on thresholds
  const shouldUseFallback =
    fileCount > FILE_COUNT_THRESHOLD || sizeKB / 1024 > SIZE_THRESHOLD_MB;

  if (shouldUseFallback) {
    console.log(
      `[Fetcher] Repo ${owner}/${repo} exceeds thresholds ` +
        `(${fileCount} files, ${(sizeKB / 1024).toFixed(1)}MB). Using git clone fallback.`
    );
    meta.usedFallback = true;
    const files = await fetchViaClone(githubUrl, githubToken);
    return { files, meta };
  }

  console.log(
    `[Fetcher] Fetching ${owner}/${repo} via REST API (${fileCount} files).`
  );
  const files = await fetchViaRestApi(octokit, owner, repo, allFiles);
  return { files, meta };
}

// ─── Strategy A: REST API ─────────────────────────────────────────────────────

async function fetchViaRestApi(
  octokit: Octokit,
  owner: string,
  repo: string,
  treeItems: Array<{ path?: string; sha?: string; size?: number }>
): Promise<RawFile[]> {
  const results: RawFile[] = [];

  // Filter to only files we care about before fetching content
  const relevant = treeItems.filter((item) => {
    if (!item.path) return false;
    if (!isRelevantFile(item.path)) return false;
    if ((item.size ?? 0) > MAX_FILE_SIZE_BYTES) return false;
    return true;
  });

  console.log(
    `[Fetcher] ${relevant.length} relevant files out of ${treeItems.length} total.`
  );

  // Fetch in parallel batches of 20 to avoid rate limiting
  const BATCH_SIZE = 20;
  for (let i = 0; i < relevant.length; i += BATCH_SIZE) {
    const batch = relevant.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async (item) => {
        const { data } = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: item.sha!,
        });

        // GitHub returns blob content as base64
        const content = Buffer.from(data.content, "base64").toString("utf-8");

        return {
          path: item.path!,
          content,
          sizeBytes: item.size ?? Buffer.byteLength(content),
        } satisfies RawFile;
      })
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.warn(`[Fetcher] Failed to fetch a file:`, result.reason);
      }
    }
  }

  return results;
}

// ─── Strategy B: Git Clone Fallback ──────────────────────────────────────────

async function fetchViaClone(
  githubUrl: string,
  githubToken?: string
): Promise<RawFile[]> {
  // Create a unique temp directory for this clone
  const tempDir = path.join(os.tmpdir(), `git-master-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    console.log(`[Fetcher] Cloning into ${tempDir}...`);

    await git.clone({
      fs,
      http,
      dir: tempDir,
      url: githubUrl,
      depth: 1, // Shallow clone — we only need latest snapshot, not history
      singleBranch: true,
      onAuth: githubToken
        ? () => ({ username: githubToken, password: "" })
        : undefined,
    });

    console.log(`[Fetcher] Clone complete. Walking file tree...`);

    const results: RawFile[] = [];
    walkDir(tempDir, tempDir, results);
    return results;
  } finally {
    // Always clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`[Fetcher] Cleaned up temp dir ${tempDir}`);
  }
}

/**
 * Recursively walks a cloned directory and reads relevant files.
 */
function walkDir(rootDir: string, currentDir: string, results: RawFile[]): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      // Skip ignored directories
      if (IGNORED_PATHS.has(entry.name)) continue;
      walkDir(rootDir, fullPath, results);
    } else if (entry.isFile()) {
      if (!isRelevantFile(relativePath)) continue;

      const stat = fs.statSync(fullPath);
      if (stat.size > MAX_FILE_SIZE_BYTES) continue;

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        results.push({ path: relativePath, content, sizeBytes: stat.size });
      } catch {
        console.warn(`[Fetcher] Could not read file: ${relativePath}`);
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRelevantFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) return false;

  const parts = filePath.split("/");
  for (const part of parts) {
    if (IGNORED_PATHS.has(part)) return false;
  }

  return true;
}
