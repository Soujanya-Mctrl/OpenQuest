# 🐙 git-master

**git-master** is a GitHub-native code-intelligence & contribution accelerator. Paste any public repo URL and get an AI-powered, personalized "how to contribute" workflow — plus a code-aware RAG engine, one-click fork & clone, deterministic skill profiles for personalization, and an indexable code knowledge base for grounded question answering.

---

## ✨ Features

- **Instant AI Analysis**: Paste a public GitHub URL and instantly receive an AI overview, multi-dimensional difficulty assessment, health signals, and a prioritized list of beginner-friendly issues.
- **Skill Profiles**: Log in via GitHub to automatically build a deterministic `skill_profile`. Difficulties and issue recommendations adapt seamlessly to your experience level.
- **Code-Aware RAG Engine**: Ask direct questions about the codebase (e.g., "Where is authentication handled?"). The AI will search indexed code and return answers citing exact file paths and line numbers.
- **One-Click Fork & Clone**: Instantly fork the repository to your account, view your clone command, and optionally generate a working branch for a specific issue.

---

## 🏗️ Architecture Stack

`git-master` is built as an `npm` workspace monorepo. It cleanly separation the UI and API layers while sharing canonical types.

### **Frontend** (`apps/web`)
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS & Shadcn UI
- **Animations**: Framer Motion
- **Data Fetching/State**: TanStack Query & Zustand
- **Auth**: NextAuth / custom OAuth

### **Backend AI Service** (`apps/api`)
- **Framework**: Node.js + Express (TypeScript)
- **Database**: PostgreSQL (Prisma ORM) & pgvector for embeddings
- **Queueing & Caching**: Redis + BullMQ (for background indexing jobs)
- **AI / Embeddings**: Gemini 1.5 Flash LLM + Gemini Embeddings (with Xenova fallback for local dev)

---

## 📂 Project Structure

```text
git-master/
├── .agent/                  # 🤖 AI Agent skills & configs (BACKEND, FRONTEND, RAG)
├── apps/
│   ├── api/                 # 🧠 AI + RAG Backend Service (Express)
│   │   ├── prisma/          # Database schemas
│   │   └── src/
│   │       ├── cache/       # Redis caching layer logic
│   │       ├── db/          # Database connection module
│   │       ├── modules/     # Domain-specific logic
│   │       ├── rag/         # RAG engine (chunking, embeddings, retrieval)
│   │       ├── routes/      # Express API routes definition
│   │       └── skill-profile/ # Logic for generating developer skill profiles
│   ├── web/                 # 🌐 Next.js Frontend (UI App)
│   │   ├── app/             # Next.js App Router (auth, repo analysis, API)
│   │   ├── components/      # React components (UI widgets, repo UI, RAG UI)
│   │   ├── hooks/           # Custom React hooks (data state)
│   │   └── lib/             # Frontend utility functions
│   └── worker/              # ⚙️ Background indexing service
│       └── src/
│           ├── jobs/        # Heavy processing jobs (e.g., codebase indexing)
│           └── queue/       # Redis message queue setups
├── packages/                # 📦 Shared Monorepo packages
│   ├── shared-types/        # Shared TypeScript interfaces (analysis, rag, user)
│   ├── ui/                  # Reusable UI component library
│   └── utils/               # Shared common utility functions
└── infra/                   # 🏗️ Infrastructure & Deployment configs
    ├── docker/              # Dockerfiles (web, api, worker) & compose
    └── scripts/             # Utility scripts (database seeding, mock repos)
```

### Explanation of Key Directories:

- **`apps/api`**: The core intelligence hub. Handles repository manifest generation, AI interactions using Gemini, skill profile assembly, and houses the core logic for the RAG embedding and retrieval pipeline.
- **`apps/web`**: Connects users to the repository insights. Follows Next.js best practices with the App Router, providing a responsive UI for viewing difficulty assessments, asking code questions, and viewing architecture.
- **`apps/worker`**: Exists purely to offload slow operations. Whenever a large repository is indexed (cloning, chunking, and embedding), the worker isolates the slow job, keeping the API responsive.
- **`packages/shared-types`**: The single source of truth for the payload shapes used by both the backend API and frontend, ensuring strict type-safety across the codebase.
- **`infra/`**: Houses all deployment and containerization settings. Contains Docker configurations to spin up the multi-service architecture locally using a single compose command.

---

## 🚀 Local Development Setup (Docker Compose)

The easiest and recommended way to run `git-master` locally is via Docker Compose. This boots the Next.js frontend, Express API, PostgreSQL (with pgvector), Redis, and the background indexing worker simultaneously.

### Prerequisites

Ensure you have the following installed:
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### 1. Clone & Configure Environment

Clone the repo:

```bash
git clone https://github.com/your-username/git-master.git
cd git-master
```

Create a root `.env` file containing your internal Docker networking endpoints:

```env
# Internal Docker DNS Networking
DATABASE_URL=postgresql://gitmaster:gitmaster@db:5432/gitmaster
REDIS_URL=redis://redis:6379

# Express Server config (must match compose port mappings)
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=git-master

# Local Dev Settings
NODE_ENV=development
JWT_SECRET=supersecret_dev_key
JWT_EXPIRY=7d
ALLOWED_ORIGINS=http://localhost:3000

# API Keys (Provide real values locally)
GEMINI_API_KEY=your_gemini_key_here
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_INDEX=git-master-index
CACHE_TTL_SECONDS=3600

# Auth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SESSION_SECRET=supersecret_cookie_key
```

### 2. Run the Entire Project

From the repository root, execute the following command:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

**Boom.** You now have a complete AI system running:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:3001](http://localhost:3001)
- **Database**: PostgreSQL available on port 5432
- **Redis**: Available on port 6379
- **Worker**: Processing background indexing jobs automatically without blocking the UI

---

## 🧠 Core Systems Detail

### The RAG Pipeline (`apps/api/src/modules/rag`)
When a repository is indexed:
1. **Ingestion**: The backend fetches all valid files (e.g. `.ts`, `.py`, `.go`), skipping `node_modules` and binaries.
2. **Chunking**: Code is chunked using an AST-based sliding window function that preserves symbols (functions/classes) and line markers.
3. **Embeddings**: Chunks are processed by the embedding engine (Gemini Embeddings or Xenova) and vaulted in pgvector/Pinecone.
4. **Retrieval**: When queried, a vector search retrieves the top-K chunks. We rerank these by file proximity and inject them into a strict "grounding-only" prompt alongside the user's question to prevent AI hallucination.

### The Background Worker (`apps/worker`)
To prevent the UI from blocking, we use BullMQ on top of Redis running as a dedicated standalone service. When a user pastes a repo URL, the backend responds immediately. The deep indexing task (fetching, chunking, embedding) runs securely in the background while the UI listens for completion bounds.

---

## 🔒 Security Notes
- `git-master` requests minimal GitHub OAuth Scopes (primarily `public_repo`).
- User tokens are not exposed to the client; they are maintained securely on the server wrapper.
- Heavy endpoints (like full repo ingestion) are rate-limited via Redis.
