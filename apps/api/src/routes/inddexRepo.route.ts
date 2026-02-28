/**
 * apps/api/src/routes/indexRepo.route.ts
 *
 * POST /api/index
 * Triggered when a user pastes a GitHub URL.
 * Immediately enqueues a background job and responds — UI doesn't block.
 */

import { Router, Request, Response } from "express";
import IORedis from "ioredis";
import {
    createIndexRepoQueue,
    type IndexRepoJobData,
} from "../../../worker/src/jobs/indexRepoJob";
import { parseGitHubUrl } from "../rag/ingestion/githubFetcher";

export function createIndexRepoRouter(redis: IORedis): Router {
    const router = Router();
    const queue = createIndexRepoQueue(redis);

    /**
     * POST /api/index
     * Body: { githubUrl: string }
     */
    router.post("/", async (req: Request, res: Response) => {
        const { githubUrl } = req.body;

        if (!githubUrl || typeof githubUrl !== "string") {
            return res.status(400).json({ error: "githubUrl is required" });
        }

        // Validate it's a real GitHub URL before queuing
        try {
            parseGitHubUrl(githubUrl);
        } catch {
            return res.status(400).json({ error: "Invalid GitHub URL" });
        }

        const jobData: IndexRepoJobData = {
            githubUrl,
            githubToken: (req as any).user?.githubToken, // Attached by auth middleware
            requestedBy: (req as any).user?.id,
        };

        const job = await queue.add("index-repo", jobData);

        console.log(`[API] Enqueued index job ${job.id} for ${githubUrl}`);

        // Respond immediately — don't wait for the job to complete
        return res.status(202).json({
            message: "Indexing started",
            jobId: job.id,
            githubUrl,
        });
    });

    /**
     * GET /api/index/status/:jobId
     * Poll for job completion from the frontend.
     */
    router.get("/status/:jobId", async (req: Request, res: Response) => {
        const job = await queue.getJob(req.params.jobId as string);

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        const state = await job.getState();
        const progress = job.progress;
        const result = job.returnvalue;
        const failReason = job.failedReason;

        return res.json({ jobId: job.id, state, progress, result, failReason });
    });

    return router;
}