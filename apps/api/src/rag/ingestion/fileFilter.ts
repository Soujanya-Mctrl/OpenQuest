/**
 * fileFilter.ts
 *
 * Central configuration for what files are worth indexing.
 * Used by both the REST API fetcher and the git clone walker.
 *
 * Also exports a `filterFiles` function that takes a RawFile[]
 * and returns only the files worth chunking + embedding.
 */

import type { RawFile } from "./githubFetcher";

// ─── Whitelisted Extensions ───────────────────────────────────────────────────
// Only these file types will be fetched, chunked, and embedded.

export const SUPPORTED_EXTENSIONS = new Set([
  // TypeScript / JavaScript
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",

  // Python
  ".py",

  // Config / Docs (useful for README, contributing guides)
  ".md",
  ".mdx",
  ".json",   // package.json, tsconfig, etc.
  ".yaml",
  ".yml",
  ".toml",
]);

// ─── Ignored Directory / File Names ──────────────────────────────────────────
// Any path segment matching one of these will be skipped entirely.

export const IGNORED_PATHS = new Set([
  // Dependency directories
  "node_modules",
  ".pnp",
  "vendor",
  "venv",
  ".venv",
  "env",
  "__pypackages__",

  // Build outputs
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  "__pycache__",
  ".pytest_cache",
  "*.egg-info",

  // Version control & IDE
  ".git",
  ".svn",
  ".hg",
  ".idea",
  ".vscode",

  // Test coverage & reports
  "coverage",
  ".nyc_output",
  "htmlcov",

  // Misc
  "tmp",
  "temp",
  "logs",
]);

// ─── Ignored File Name Patterns ───────────────────────────────────────────────
// Exact filenames (not extensions) to always skip.

const IGNORED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "Pipfile.lock",
  "composer.lock",
  ".DS_Store",
  "Thumbs.db",
  ".env",
  ".env.local",
  ".env.production",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.json",
  "jest.config.js",
  "jest.config.ts",
  "vitest.config.ts",
]);

// ─── Size Limits ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB — files larger than this are rarely useful to RAG
const MIN_FILE_SIZE_BYTES = 10;         // Skip essentially empty files

// ─── Filter Function ──────────────────────────────────────────────────────────

export interface FilterResult {
  accepted: RawFile[];
  rejected: Array<{ path: string; reason: string }>;
}

/**
 * Filters a list of raw files down to only those worth indexing.
 * Returns both accepted files and a rejection log (useful for debugging).
 */
export function filterFiles(files: RawFile[]): FilterResult {
  const accepted: RawFile[] = [];
  const rejected: Array<{ path: string; reason: string }> = [];

  for (const file of files) {
    const result = shouldIndex(file);
    if (result.index) {
      accepted.push(file);
    } else {
      rejected.push({ path: file.path, reason: result.reason! });
    }
  }

  console.log(
    `[Filter] ${accepted.length} accepted, ${rejected.length} rejected from ${files.length} total files.`
  );

  return { accepted, rejected };
}

// ─── Internal Decision Logic ──────────────────────────────────────────────────

function shouldIndex(file: RawFile): { index: true } | { index: false; reason: string } {
  const filename = file.path.split("/").pop() ?? "";
  const ext = filename.includes(".") ? "." + filename.split(".").pop()!.toLowerCase() : "";
  const pathParts = file.path.split("/");

  // 1. Check if any path segment is in the ignored list
  for (const part of pathParts.slice(0, -1)) {
    if (IGNORED_PATHS.has(part)) {
      return { index: false, reason: `ignored directory: ${part}` };
    }
  }

  // 2. Check exact filename blacklist
  if (IGNORED_FILENAMES.has(filename)) {
    return { index: false, reason: `ignored filename: ${filename}` };
  }

  // 3. Check extension whitelist
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return { index: false, reason: `unsupported extension: ${ext}` };
  }

  // 4. Check file size
  if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { index: false, reason: `too large: ${(file.sizeBytes / 1024).toFixed(1)}KB` };
  }

  if (file.sizeBytes < MIN_FILE_SIZE_BYTES) {
    return { index: false, reason: `too small: ${file.sizeBytes} bytes` };
  }

  // 5. Check for binary content (heuristic: null bytes in content)
  if (file.content.includes("\0")) {
    return { index: false, reason: "binary file detected" };
  }

  return { index: true };
}