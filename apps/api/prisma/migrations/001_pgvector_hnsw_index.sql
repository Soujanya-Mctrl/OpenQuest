-- migrations/001_pgvector_hnsw_index.sql
--
-- Run AFTER `npx prisma migrate dev` has created the tables.
-- This adds the HNSW index that makes vector similarity search fast.
--
-- HNSW (Hierarchical Navigable Small World) is pgvector's recommended
-- index for high-recall approximate nearest-neighbor search.
--
-- Execute with:
--   psql $DATABASE_URL -f migrations/001_pgvector_hnsw_index.sql

-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index on the embedding column using cosine distance
-- m=16: connections per layer (higher = better recall, more memory)
-- ef_construction=64: build-time search width (higher = better quality, slower build)
CREATE INDEX IF NOT EXISTS code_chunks_embedding_hnsw_idx
  ON code_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Standard B-tree index on repoId for fast per-repo filtering
CREATE INDEX IF NOT EXISTS code_chunks_repo_id_idx
  ON code_chunks (repo_id);