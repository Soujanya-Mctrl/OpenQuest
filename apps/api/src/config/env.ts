import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(8000),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_SECRET: z.string().default('dev_secret_git_master'),
    JWT_EXPIRY: z.string().default('7d'),
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
    GEMINI_API_KEY: z.string().optional(),
    PINECONE_API_KEY: z.string().optional(),
    PINECONE_INDEX: z.string().default('git-master-index'),
    CACHE_TTL_SECONDS: z.coerce.number().default(3600),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid env vars:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = parsed.data;
