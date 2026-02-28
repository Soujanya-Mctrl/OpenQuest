import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface IndexJobData {
    jobId: string;
    repoUrl: string;
    repoId: string;
    userId?: string;
}

export const indexQueue = new Queue<IndexJobData>('index-jobs', {
    connection: connection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});

export async function enqueueIndexJob(data: IndexJobData) {
    return indexQueue.add('process', data, { jobId: data.jobId });
}
