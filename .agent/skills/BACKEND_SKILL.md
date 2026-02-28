---
name: backend
description: >
  Use this skill whenever the user wants to scaffold, build, or configure the backend server.
  Triggers include: 'create an API', 'set up Express', 'build REST endpoints', 'add authentication',
  'connect PostgreSQL', 'set up Redis', 'add a job queue', 'BullMQ worker', 'write backend logic',
  'set up middleware', 'create routes', or any mention of server-side TypeScript code.
  Also use for Docker configuration, environment variable management, CORS setup, Prisma schema,
  caching patterns, and deployment prep.
  Stack: Node.js + Express + TypeScript + PostgreSQL (Prisma) + Redis + BullMQ.
license: MIT
---

# ⚙️ Backend Skill — Express + TypeScript + PostgreSQL + Redis + BullMQ

> Production-ready async API with job queuing, caching, and a typed DB layer.

---

## 🗺️ Architecture at a Glance

```
Client (Next.js)
      │ HTTP / REST
      ▼
Express API Server
  ├── checks Redis cache
  ├── cache hit  → return instantly
  └── cache miss → push job to BullMQ → return { jobId }
                         │
                    Redis (queue store)
                         │
                    BullMQ Worker
                      ├── runs RAG layer
                      ├── calls LLM (Anthropic)
                      ├── saves result → PostgreSQL
                      └── caches result → Redis (TTL: 1hr)
```

---

## 🗺️ Quick Reference

| Concern              | Tool                   | Install                                            |
|----------------------|------------------------|----------------------------------------------------|
| Web framework        | Express + TypeScript   | `npm i express` + `npm i -D typescript`            |
| Database ORM         | Prisma + PostgreSQL    | `npm i prisma @prisma/client`                      |
| Cache + queue store  | Redis (ioredis)        | `npm i ioredis`                                    |
| Job queue            | BullMQ                 | `npm i bullmq`                                     |
| Auth                 | JWT + bcrypt           | `npm i jsonwebtoken bcryptjs`                      |
| Validation           | Zod                    | `npm i zod`                                        |
| Security headers     | Helmet                 | `npm i helmet`                                     |
| Logging              | Pino                   | `npm i pino pino-http pino-pretty`                 |
| ID generation        | uuid                   | `npm i uuid`                                       |

---

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Entry point
│   ├── config.ts               # Zod-validated env vars
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── ask.ts              # AI query endpoint (queue + poll)
│   │   └── users.ts
│   ├── middleware/
│   │   ├── auth.ts             # JWT guard
│   │   ├── validate.ts         # Zod request validation
│   │   └── errorHandler.ts
│   ├── services/
│   │   ├── cache.ts            # Redis get/set helpers
│   │   └── queue.ts            # BullMQ producer
│   ├── workers/
│   │   └── ragWorker.ts        # BullMQ consumer
│   ├── db/
│   │   └── prisma.ts           # Prisma client singleton
│   └── types/
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── .env
├── tsconfig.json
├── package.json
└── Dockerfile
```

---

## 🚀 Bootstrap

### 1. Install Everything

```bash
npm init -y
npm install express helmet cors dotenv ioredis bullmq jsonwebtoken bcryptjs zod pino pino-http uuid
npm install @prisma/client
npm install -D typescript ts-node @types/express @types/node @types/jsonwebtoken @types/bcryptjs @types/uuid nodemon prisma
npx tsc --init
npx prisma init
```

### 2. `src/config.ts`

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string(),
  JWT_EXPIRY: z.string().default('7d'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  ANTHROPIC_API_KEY: z.string(),
  CACHE_TTL_SECONDS: z.coerce.number().default(3600),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid env vars:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
```

### 3. `src/app.ts`

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { authRouter } from './routes/auth';
import { askRouter } from './routes/ask';
import { usersRouter } from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.ALLOWED_ORIGINS.split(','), credentials: true }));
app.use(express.json());
app.use(pinoHttp());

app.use('/api/auth', authRouter);
app.use('/api/ask', askRouter);
app.use('/api/users', usersRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use(errorHandler);

export default app;
```

### 4. `src/server.ts`

```typescript
import app from './app';
import { config } from './config';
import { startRagWorker } from './workers/ragWorker';

app.listen(config.PORT, () => {
  console.log(`🚀 API running on port ${config.PORT}`);
});

startRagWorker();
```

---

## 🗄️ Prisma Schema

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String?
  chats        Chat[]
  createdAt    DateTime  @default(now())
}

model Chat {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
}

model Message {
  id        String   @id @default(cuid())
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id])
  role      String   // 'user' | 'assistant'
  content   String
  createdAt DateTime @default(now())
}
```

```bash
# Run after editing schema
npx prisma migrate dev --name init
npx prisma generate
```

### `src/db/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## ⚡ Redis Cache Service

```typescript
// src/services/cache.ts
import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.REDIS_URL);

redis.on('error', (err) => console.error('Redis error:', err));

export async function getCached<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  return val ? (JSON.parse(val) as T) : null;
}

export async function setCache(key: string, value: unknown, ttl = config.CACHE_TTL_SECONDS) {
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
}

export function buildCacheKey(query: string): string {
  // Normalize so "What is AI?" and "what is ai?" hit the same cache entry
  return `cache:ask:${query.toLowerCase().trim().replace(/\s+/g, ' ')}`;
}
```

---

## 📋 BullMQ — Queue Producer

```typescript
// src/services/queue.ts
import { Queue } from 'bullmq';
import { redis } from './cache';

export interface RagJobData {
  jobId: string;
  query: string;
  userId: string;
  chatId: string;
}

export const ragQueue = new Queue<RagJobData>('rag-jobs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function enqueueRagJob(data: RagJobData) {
  return ragQueue.add('process', data, { jobId: data.jobId });
}
```

---

## 👷 BullMQ — RAG Worker

```typescript
// src/workers/ragWorker.ts
import { Worker, Job } from 'bullmq';
import { redis, setCache, buildCacheKey } from '../services/cache';
import { prisma } from '../db/prisma';
import { runRagPipeline } from '../../rag/pipeline'; // shared monorepo package
import type { RagJobData } from '../services/queue';

export function startRagWorker() {
  const worker = new Worker<RagJobData>(
    'rag-jobs',
    async (job: Job<RagJobData>) => {
      const { query, chatId } = job.data;

      console.log(`🔄 Processing job ${job.id}: "${query}"`);

      // 1. Run RAG pipeline (retrieve + generate)
      const answer = await runRagPipeline(query);

      // 2. Cache result
      await setCache(buildCacheKey(query), answer);

      // 3. Persist to PostgreSQL
      await prisma.message.createMany({
        data: [
          { chatId, role: 'user', content: query },
          { chatId, role: 'assistant', content: answer },
        ],
      });

      return { answer };
    },
    { connection: redis, concurrency: 3 }
  );

  worker.on('completed', (job) => console.log(`✅ Job ${job.id} complete`));
  worker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err.message));

  console.log('👷 RAG worker started (concurrency: 3)');
  return worker;
}
```

---

## 🔌 Ask Route — Full Request Lifecycle

```typescript
// src/routes/ask.ts
import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getCached, buildCacheKey } from '../services/cache';
import { enqueueRagJob, ragQueue } from '../services/queue';
import { authGuard } from '../middleware/auth';

export const askRouter = Router();

const AskSchema = z.object({
  query: z.string().min(1).max(1000),
  chatId: z.string().optional(),
});

// POST /api/ask → check cache → queue job → return jobId
askRouter.post('/', authGuard, async (req, res, next) => {
  try {
    const { query, chatId } = AskSchema.parse(req.body);

    // Cache hit → respond instantly
    const cached = await getCached<string>(buildCacheKey(query));
    if (cached) {
      return res.json({ answer: cached, source: 'cache' });
    }

    // Cache miss → enqueue
    const jobId = uuid();
    await enqueueRagJob({
      jobId,
      query,
      userId: req.user.id,
      chatId: chatId ?? uuid(),
    });

    res.status(202).json({ jobId, status: 'queued' });
  } catch (err) {
    next(err);
  }
});

// GET /api/ask/:jobId → poll for result
askRouter.get('/:jobId', authGuard, async (req, res, next) => {
  try {
    const job = await ragQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const state = await job.getState();

    if (state === 'completed') {
      return res.json({ status: 'completed', answer: job.returnvalue.answer });
    }
    if (state === 'failed') {
      return res.status(500).json({ status: 'failed', error: job.failedReason });
    }

    res.json({ status: state }); // 'waiting' | 'active' | 'delayed'
  } catch (err) {
    next(err);
  }
});
```

---

## 🔐 JWT Auth

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface JwtPayload { id: string; email: string; }

declare global {
  namespace Express { interface Request { user: JwtPayload; } }
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function createToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRY as string });
}
```

---

## 🚨 Error Handler

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

---

## 🐳 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8000
CMD ["node", "dist/server.js"]
```

---

## `.env`

```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_this_in_production_min_32_chars
JWT_EXPIRY=7d
ALLOWED_ORIGINS=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
CACHE_TTL_SECONDS=3600
```

---

## ✅ Checklist Before Shipping

- [ ] All secrets in `.env`, validated at startup via Zod
- [ ] CORS restricted to known frontend origins
- [ ] Auth guard on all protected routes
- [ ] BullMQ retry + exponential backoff configured
- [ ] Redis connection error handled gracefully
- [ ] Prisma migrations committed to repo
- [ ] `GET /health` returns uptime
- [ ] Error handler returns consistent `{ error, details }` JSON
- [ ] Dockerfile builds and runs cleanly

---

## 🚨 Common Mistakes to Avoid

| ❌ Mistake                               | ✅ Fix                                                  |
|------------------------------------------|---------------------------------------------------------|
| Blocking Express while AI job runs       | Always queue via BullMQ, return `jobId` immediately     |
| No retry on failed AI jobs               | Set `attempts: 3` + exponential backoff in BullMQ       |
| Caching without query normalization      | Lowercase + trim + collapse whitespace before cache key |
| New Prisma client per request            | Use the global singleton in `db/prisma.ts`              |
| Raw errors returned to client            | All errors flow through `errorHandler` middleware       |
| Multiple Redis connections               | Import and reuse the single `redis` instance everywhere |
