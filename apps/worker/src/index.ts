/**
 * apps/worker/src/index.ts
 *
 * Entry point for the background worker service.
 * Boots a Redis connection and starts all BullMQ workers.
 */

import "dotenv/config";
import IORedis from "ioredis";
import { startIndexRepoWorker } from "./jobs/indexRepoJob";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

async function main() {
  console.log("[Worker Service] Starting...");

  const redis = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
  });

  redis.on("connect", () => console.log("[Worker Service] Redis connected"));
  redis.on("error", (err) => console.error("[Worker Service] Redis error:", err));

  // Start all workers
  startIndexRepoWorker(redis);

  console.log("[Worker Service] ✅ All workers running. Waiting for jobs...");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("[Worker Service] SIGTERM received. Shutting down...");
    await redis.quit();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[Worker Service] Fatal error:", err);
  process.exit(1);
});