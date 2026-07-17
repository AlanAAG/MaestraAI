-- NEM knowledge RAG layer: the institutional corpus (context/*.md) chunked + embedded so
-- planeación generation retrieves EXACT relevant passages (long-tail knowledge) instead of
-- relying only on the static NEM_SYNTHESIS / grounding blocks (which stay as-is, always-on).
-- Populated by: npx tsx scripts/ingest-nem-knowledge.mjs (service role, wipe-and-reload per file).
-- Degrades gracefully: until this is pushed + ingested, retrieval catches + skips.

create extension if not exists vector;

create table if not exists nem_knowledge (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,        -- corpus filename, e.g. 'Evaluacion-Formativa-Fase2.md'
  heading_path text,                 -- breadcrumb, e.g. 'Fichero: Evaluación Formativa > Ficha 3'
  content      text not null,        -- the chunk text (verbatim from the corpus)
  tokens       int,                  -- rough token estimate (informational)
  embedding    vector(1536),         -- OpenAI text-embedding-3-small
  created_at   timestamptz default now()
);

create index if not exists nem_knowledge_source_idx
  on nem_knowledge (source);
create index if not exists nem_knowledge_vec_idx
  on nem_knowledge using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table nem_knowledge enable row level security;

-- Official SEP knowledge is not sensitive: any authenticated user may read.
-- No INSERT/UPDATE/DELETE policies — only the service role (ingestion script) writes.
drop policy if exists "read nem knowledge" on nem_knowledge;
create policy "read nem knowledge" on nem_knowledge
  for select to authenticated
  using (true);

-- Cosine-similarity match over the whole corpus (mirrors match_planeaciones in 054).
-- security invoker (default) → RLS applies (authenticated read-all).
create or replace function match_nem_knowledge(
  query_embedding vector(1536),
  match_count int
)
returns table (id uuid, source text, heading_path text, content text, similarity float)
language sql
stable
as $$
  select k.id, k.source, k.heading_path, k.content,
         1 - (k.embedding <=> query_embedding) as similarity
  from nem_knowledge k
  where k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count;
$$;
