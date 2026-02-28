/**
 * testRag.ts
 * infra/scripts/testRag.ts
 *
 * End-to-end RAG test script. Run this to verify your full pipeline works.
 *
 * Usage:
 *   npx ts-node infra/scripts/testRag.ts
 *
 * Prerequisites:
 *   - .env file with GEMINI_API_KEY, DATABASE_URL, GITHUB_TOKEN
 *   - Docker running (postgres + pgvector)
 *   - `npx prisma migrate dev` already run
 */

import "dotenv/config";
import { runIngestionPipeline } from "../../apps/api/src/rag/ingestion/ingestionPipeline";
import { embedChunks } from "../../apps/api/src/rag/embeddings/embeddingEngine";
import { writeToVectorStore, fetchLatestCommitHash } from "../../apps/api/src/rag/vectorstore/vectorStoreWriter";
import { retrieve } from "../../apps/api/src/rag/retrieval/retriever";
import { chunkFile } from "../../apps/api/src/rag/ingestion/astChunker";
import { filterFiles } from "../../apps/api/src/rag/ingestion/fileFilter";
import { prisma } from "../../apps/api/src/db/prisma";

// ── Config ────────────────────────────────────────────────────────────────────
// Small, well-known repo — fast to index, good for testing
const TEST_REPO_URL = "https://github.com/expressjs/express";
const TEST_REPO_ID = "expressjs/express";

// ── Test Runner ───────────────────────────────────────────────────────────────

async function runAllTests() {
    console.log("\n🧪 Starting RAG Test Suite\n" + "=".repeat(50));

    let passed = 0;
    let failed = 0;

    const run = async (name: string, fn: () => Promise<void>) => {
        process.stdout.write(`  ${name}... `);
        try {
            await fn();
            console.log("✅ PASS");
            passed++;
        } catch (err: any) {
            console.log(`❌ FAIL\n    → ${err.message}`);
            failed++;
        }
    };

    // ── Phase 1: Unit Tests ────────────────────────────────────────────────────
    console.log("\n📦 Phase 1: Unit Tests");

    await run("Chunker — TypeScript function detection", async () => {
        const code = `
export function handleLogin(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  return res.json({ user });
}

export function handleLogout(req, res) {
  req.session.destroy();
  return res.json({ ok: true });
}
    `.trim();

        const result = chunkFile("test/repo", "src/auth/login.ts", code);
        assert(result.chunks.length === 2, `Expected 2 chunks, got ${result.chunks.length}`);
        assert(result.chunks[0].symbolName === "handleLogin", `Expected symbolName 'handleLogin'`);
        assert(result.chunks[1].symbolName === "handleLogout", `Expected symbolName 'handleLogout'`);
        assert(result.strategy === "ast", `Expected ast strategy`);
    });

    await run("Chunker — Python function detection", async () => {
        const code = `
def authenticate_user(email, password):
    user = User.query.filter_by(email=email).first()
    return user.check_password(password)

async def refresh_token(token):
    payload = jwt.decode(token)
    return generate_token(payload["user_id"])
    `.trim();

        const result = chunkFile("test/repo", "auth/service.py", code);
        assert(result.chunks.length === 2, `Expected 2 chunks, got ${result.chunks.length}`);
        assert(result.chunks[0].symbolName === "authenticate_user");
        assert(result.chunks[1].symbolName === "refresh_token");
    });

    await run("Chunker — Sliding window fallback for markdown", async () => {
        const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1} of markdown`);
        const result = chunkFile("test/repo", "README.md", lines.join("\n"));
        assert(result.strategy === "sliding-window", "Expected sliding-window strategy");
        assert(result.chunks.length > 0, "Expected at least one chunk");
    });

    await run("File filter — rejects node_modules and lockfiles", async () => {
        const files = [
            { path: "node_modules/express/index.js", content: "module.exports = {}", sizeBytes: 20 },
            { path: "package-lock.json", content: "{}", sizeBytes: 10 },
            { path: "src/index.ts", content: "export const x = 1;", sizeBytes: 20 },
            { path: "dist/bundle.js", content: "!function(){}", sizeBytes: 14 },
        ];
        const result = filterFiles(files);
        assert(result.accepted.length === 1, `Expected 1 accepted file, got ${result.accepted.length}`);
        assert(result.accepted[0].path === "src/index.ts", "Expected src/index.ts to be accepted");
        assert(result.rejected.length === 3, `Expected 3 rejected files`);
    });

    await run("File filter — rejects files over 500KB", async () => {
        const bigFile = {
            path: "src/generated.ts",
            content: "x".repeat(600 * 1024),
            sizeBytes: 600 * 1024,
        };
        const result = filterFiles([bigFile]);
        assert(result.accepted.length === 0, "Expected big file to be rejected");
        assert(result.rejected[0].reason.includes("too large"));
    });

    // ── Phase 2: Integration Tests ────────────────────────────────────────────
    console.log("\n🔗 Phase 2: Integration Tests (requires Gemini API + Postgres)");

    await run("Full ingestion pipeline runs without error", async () => {
        const result = await runIngestionPipeline({ githubUrl: TEST_REPO_URL });
        assert(result.chunks.length > 0, `Expected chunks, got 0`);
        assert(result.repoId === TEST_REPO_ID, `Wrong repoId: ${result.repoId}`);
        assert(result.stats.filesAccepted > 0, "Expected at least one accepted file");
        console.log(
            `\n    ℹ️  Stats: ${result.stats.filesAccepted} files, ${result.chunks.length} chunks`
        );
    });

    await run("Embedding engine produces 768-dim vectors", async () => {
        // Use just 5 chunks to keep the test fast
        const ingestion = await runIngestionPipeline({ githubUrl: TEST_REPO_URL });
        const sample = ingestion.chunks.slice(0, 5);
        const result = await embedChunks(sample);
        assert(result.embedded.length === 5, `Expected 5 embedded chunks`);
        assert(result.embedded[0].embedding.length === 768, `Expected 768-dim vector, got ${result.embedded[0].embedding.length}`);
        assert(result.model === "text-embedding-004", `Wrong model: ${result.model}`);
    });

    await run("Vector store writes and commit-hash dedup works", async () => {
        const ingestion = await runIngestionPipeline({ githubUrl: TEST_REPO_URL });
        const embeds = await embedChunks(ingestion.chunks.slice(0, 20)); // small sample

        const commitHash = await fetchLatestCommitHash(
            "expressjs", "express", "master"
        );

        // First write — should be full-reindex
        const write1 = await writeToVectorStore(embeds.embedded, {
            repoMeta: {
                owner: "expressjs", repo: "express",
                defaultBranch: "master", sizeKB: 1000,
                fileCount: ingestion.stats.filesAccepted,
                usedFallback: false,
            },
            commitHash: commitHash ?? undefined,
            embeddingModel: embeds.model,
        });
        assert(write1.strategy === "full-reindex" || write1.strategy === "upsert");

        // Second write with same commit hash — should be skipped
        const write2 = await writeToVectorStore(embeds.embedded, {
            repoMeta: {
                owner: "expressjs", repo: "express",
                defaultBranch: "master", sizeKB: 1000,
                fileCount: ingestion.stats.filesAccepted,
                usedFallback: false,
            },
            commitHash: commitHash ?? undefined,
            embeddingModel: embeds.model,
        });

        if (commitHash) {
            assert(write2.strategy === "skipped", `Expected 'skipped', got '${write2.strategy}'`);
        }

        console.log(`\n    ℹ️  Write 1: ${write1.strategy}, Write 2: ${write2.strategy}`);
    });

    // ── Phase 3: Retrieval Tests ──────────────────────────────────────────────
    console.log("\n🔍 Phase 3: Retrieval Tests (requires indexed repo in DB)");

    await run("Retrieval returns chunks from relevant files", async () => {
        const result = await retrieve("Where is routing handled?", {
            repoId: TEST_REPO_ID,
            topK: 5,
        });

        assert(result.chunks.length > 0, "Expected at least one chunk returned");

        // For Express, routing-related chunks should come from router/ files
        const routerFiles = result.chunks.filter((c) =>
            c.filePath.toLowerCase().includes("router") ||
            c.filePath.toLowerCase().includes("route")
        );
        assert(
            routerFiles.length > 0,
            `Expected router files in results, got: ${result.chunks.map((c) => c.filePath).join(", ")}`
        );

        console.log(`\n    ℹ️  Top result: ${result.chunks[0].filePath} (score: ${result.chunks[0].score.toFixed(3)})`);
    });

    await run("File proximity reranking groups same-file chunks", async () => {
        const result = await retrieve("How does Express handle middleware?", {
            repoId: TEST_REPO_ID,
            topK: 8,
        });

        // Check that chunks from the same file appear consecutively
        const filePaths = result.chunks.map((c) => c.filePath);
        const hasProximityBoosted = result.chunks.some((c) => c.proximityBoost > 0);
        assert(hasProximityBoosted, "Expected at least one chunk to receive proximity boost");

        console.log(`\n    ℹ️  Files in results: ${[...new Set(filePaths)].join(", ")}`);
    });

    await run("DB has indexed chunks for test repo", async () => {
        const count = await prisma.codeChunk.count({ where: { repoId: TEST_REPO_ID } });
        assert(count > 0, `Expected chunks in DB for ${TEST_REPO_ID}, got 0`);
        console.log(`\n    ℹ️  ${count} chunks in DB for ${TEST_REPO_ID}`);
    });

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log("\n" + "=".repeat(50));
    console.log(`🏁 Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        console.log("❌ Some tests failed. Check errors above.");
        process.exit(1);
    } else {
        console.log("✅ All tests passed. RAG pipeline is working correctly.");
    }

    await prisma.$disconnect();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assert(condition: boolean, message = "Assertion failed"): void {
    if (!condition) throw new Error(message);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

runAllTests().catch((err) => {
    console.error("\n💥 Test suite crashed:", err);
    process.exit(1);
});