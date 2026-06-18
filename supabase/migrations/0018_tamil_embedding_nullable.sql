-- 0018_tamil_embedding_nullable.sql
-- Make embedding column nullable so PDF-ingested chunks can be stored
-- without an OpenAI embedding. Retrieval falls back to chapter-name filter
-- when embedding is NULL (already handled in pipeline-chat-fetch.ts).

alter table tamil_knowledge_chunks
  alter column embedding drop not null;
