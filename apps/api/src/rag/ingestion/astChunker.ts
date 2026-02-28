import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodeChunk {
  id: string;           // Deterministic: "{repoId}:{filePath}:{startLine}"
  repoId: string;       // Repo identifier e.g. "owner/repo"
  filePath: string;     // Relative path e.g. "src/auth/login.ts"
  language: string;     // "typescript" | "javascript" | "python" | "text"
  content: string;      // The actual code content of this chunk
  startLine: number;    // 1-indexed
  endLine: number;      // 1-indexed
  symbolName?: string;  // Function/class name if detected e.g. "handleLogin"
  chunkIndex: number;   // Position of this chunk within the file (0-indexed)
}

export interface ChunkingResult {
  chunks: CodeChunk[];
  totalChunks: number;
  strategy: "ast" | "sliding-window";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLIDING_WINDOW_SIZE = 60;    // Lines per window chunk
const SLIDING_WINDOW_OVERLAP = 15; // Overlap to preserve context across boundaries
const MAX_CHUNK_LINES = 150;       // Hard cap — never emit a chunk larger than this
const MIN_CHUNK_LINES = 3;         // Skip chunks smaller than this (e.g. blank classes)

// ─── Entry Point ─────────────────────────────────────────────────────────────

/**
 * Given a file's content and path, returns a list of CodeChunks.
 */
export function chunkFile(
  repoId: string,
  filePath: string,
  content: string
): ChunkingResult {
  const ext = path.extname(filePath).toLowerCase();
  const lines = content.split("\n");

  let chunks: CodeChunk[] = [];
  let strategy: "ast" | "sliding-window" = "ast";

  if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx" || ext === ".mjs") {
    chunks = chunkTypeScript(repoId, filePath, lines);
  } else if (ext === ".py") {
    chunks = chunkPython(repoId, filePath, lines);
  } else {
    // Markdown, JSON, YAML, etc. → sliding window
    strategy = "sliding-window";
    chunks = slidingWindowChunk(repoId, filePath, lines, "text");
  }

  // If AST chunking produced nothing (e.g. file with no top-level symbols),
  // fall back to sliding window so we don't lose the file entirely.
  if (chunks.length === 0) {
    strategy = "sliding-window";
    const lang = detectLanguage(ext);
    chunks = slidingWindowChunk(repoId, filePath, lines, lang);
  }

  return { chunks, totalChunks: chunks.length, strategy };
}

/**
 * Chunks an entire list of files and returns all chunks flat.
 */
export function chunkFiles(
  repoId: string,
  files: Array<{ path: string; content: string }>
): CodeChunk[] {
  const allChunks: CodeChunk[] = [];

  for (const file of files) {
    const result = chunkFile(repoId, file.path, file.content);
    allChunks.push(...result.chunks);
    console.log(
      `[Chunker] ${file.path} → ${result.totalChunks} chunks (${result.strategy})`
    );
  }

  console.log(`[Chunker] Total chunks across all files: ${allChunks.length}`);
  return allChunks;
}

// ─── TypeScript / JavaScript Chunker ─────────────────────────────────────────

/**
 * Regex-based AST-lite chunking for TypeScript/JavaScript.
 *
 * Detects:
 *   - export function foo() { ... }
 *   - export const foo = () => { ... }
 *   - export class Foo { ... }
 *   - export default function() { ... }
 *   - async function foo() { ... }
 *
 * Note: We use regex rather than a full tree-sitter parse because
 * tree-sitter requires native binaries which complicates Docker builds.
 * This covers ~90% of real-world TS/JS files cleanly.
 * A tree-sitter upgrade path is noted in TODO below.
 */

// Matches the start of a function or class declaration
const TS_SYMBOL_START_RE = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?\s+(\w+)|class\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[\w]+)\s*=>)/;

function chunkTypeScript(
  repoId: string,
  filePath: string,
  lines: string[]
): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const symbolBoundaries = detectSymbolBoundaries(lines, TS_SYMBOL_START_RE);

  if (symbolBoundaries.length === 0) return [];

  for (let i = 0; i < symbolBoundaries.length; i++) {
    const { startLine, symbolName } = symbolBoundaries[i];
    // End is either where the next symbol starts, or end of file
    const endLine = symbolBoundaries[i + 1]
      ? symbolBoundaries[i + 1].startLine - 1
      : lines.length;

    const chunkLines = lines.slice(startLine - 1, endLine);

    // Hard cap: if the function is huge, break it into sub-chunks
    const subChunks = splitIfTooLarge(
      repoId,
      filePath,
      "typescript",
      chunkLines,
      startLine,
      symbolName,
      i
    );

    chunks.push(...subChunks);
  }

  return chunks;
}

// ─── Python Chunker ───────────────────────────────────────────────────────────

/**
 * Detects top-level `def` and `class` blocks in Python files.
 * Handles both sync and async functions.
 */
const PY_SYMBOL_START_RE = /^(?:async\s+)?(?:def|class)\s+(\w+)/;

function chunkPython(
  repoId: string,
  filePath: string,
  lines: string[]
): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const symbolBoundaries = detectSymbolBoundaries(lines, PY_SYMBOL_START_RE);

  if (symbolBoundaries.length === 0) return [];

  for (let i = 0; i < symbolBoundaries.length; i++) {
    const { startLine, symbolName } = symbolBoundaries[i];
    const endLine = symbolBoundaries[i + 1]
      ? symbolBoundaries[i + 1].startLine - 1
      : lines.length;

    const chunkLines = lines.slice(startLine - 1, endLine);

    const subChunks = splitIfTooLarge(
      repoId,
      filePath,
      "python",
      chunkLines,
      startLine,
      symbolName,
      i
    );

    chunks.push(...subChunks);
  }

  return chunks;
}

// ─── Sliding Window Fallback ──────────────────────────────────────────────────

function slidingWindowChunk(
  repoId: string,
  filePath: string,
  lines: string[],
  language: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < lines.length; i += SLIDING_WINDOW_SIZE - SLIDING_WINDOW_OVERLAP) {
    const startLine = i + 1; // 1-indexed
    const endLine = Math.min(i + SLIDING_WINDOW_SIZE, lines.length);
    const chunkLines = lines.slice(i, endLine);

    if (chunkLines.length < MIN_CHUNK_LINES) continue;

    chunks.push({
      id: makeChunkId(repoId, filePath, startLine),
      repoId,
      filePath,
      language,
      content: chunkLines.join("\n"),
      startLine,
      endLine,
      chunkIndex: chunkIndex++,
    });

    if (endLine >= lines.length) break;
  }

  return chunks;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

interface SymbolBoundary {
  startLine: number; // 1-indexed
  symbolName: string;
}

/**
 * Scans lines for symbol-start patterns and records their start line numbers.
 */
function detectSymbolBoundaries(
  lines: string[],
  re: RegExp
): SymbolBoundary[] {
  const boundaries: SymbolBoundary[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(re);
    if (match) {
      // Extract symbol name from capture groups
      const symbolName = match[1] || match[2] || match[3] || "anonymous";
      boundaries.push({ startLine: i + 1, symbolName });
    }
  }

  return boundaries;
}

/**
 * If a detected symbol block exceeds MAX_CHUNK_LINES, split it into
 * overlapping sub-chunks while preserving the symbol name in each.
 */
function splitIfTooLarge(
  repoId: string,
  filePath: string,
  language: string,
  chunkLines: string[],
  blockStartLine: number,
  symbolName: string,
  baseIndex: number
): CodeChunk[] {
  if (chunkLines.length < MIN_CHUNK_LINES) return [];

  if (chunkLines.length <= MAX_CHUNK_LINES) {
    return [
      {
        id: makeChunkId(repoId, filePath, blockStartLine),
        repoId,
        filePath,
        language,
        content: chunkLines.join("\n"),
        startLine: blockStartLine,
        endLine: blockStartLine + chunkLines.length - 1,
        symbolName,
        chunkIndex: baseIndex,
      },
    ];
  }

  // Split into sub-windows
  const subChunks: CodeChunk[] = [];
  for (let i = 0; i < chunkLines.length; i += MAX_CHUNK_LINES - SLIDING_WINDOW_OVERLAP) {
    const slice = chunkLines.slice(i, i + MAX_CHUNK_LINES);
    if (slice.length < MIN_CHUNK_LINES) break;

    const startLine = blockStartLine + i;
    subChunks.push({
      id: makeChunkId(repoId, filePath, startLine),
      repoId,
      filePath,
      language,
      content: slice.join("\n"),
      startLine,
      endLine: startLine + slice.length - 1,
      symbolName: `${symbolName} [part ${subChunks.length + 1}]`,
      chunkIndex: baseIndex + subChunks.length,
    });

    if (i + MAX_CHUNK_LINES >= chunkLines.length) break;
  }

  return subChunks;
}

function makeChunkId(repoId: string, filePath: string, startLine: number): string {
  // Replace special characters to make a safe ID
  const safeRepo = repoId.replace(/[^a-zA-Z0-9]/g, "_");
  const safePath = filePath.replace(/[^a-zA-Z0-9]/g, "_");
  return `${safeRepo}__${safePath}__L${startLine}`;
}

function detectLanguage(ext: string): string {
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".py": "python",
    ".md": "markdown",
    ".mdx": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
  };
  return map[ext] ?? "text";
}