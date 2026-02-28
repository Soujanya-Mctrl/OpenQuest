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
    PINECONE_INDEX: z.string().default('OpenQuest-index'),
    CACHE_TTL_SECONDS: z.coerce.number().default(3600),
    // GitHub OAuth
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    CALLBACK_URL: z.string().default('http://localhost:8000/api/auth/github/callback'),
    SESSION_SECRET: z.string().default('openquest_session_secret_change_in_prod'),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid env vars:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = parsed.data;
