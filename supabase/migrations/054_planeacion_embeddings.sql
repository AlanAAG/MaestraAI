-- Teacher's-own-planeaciones retrieval: embed each generated plan, then on a new generation
-- pull the teacher's 3 most-similar past plans as <ejemplos_estilo_maestra> (her real voice).
-- Degrades gracefully: until this is pushed, the embed/retrieve calls catch + skip.

create extension if not exists vector;

create table if not exists planeacion_embeddings (
  fortnight_id uuid primary key references fortnights(id) on delete cascade,
  teacher_id  uuid not null references teachers(id) on delete cascade,
  project_name text,
  content     text,             -- the embedded voice-bearing text (kept for injection)
  embedding   vector(1536),     -- OpenAI text-embedding-3-small
  created_at  timestamptz default now()
);

create index if not exists planeacion_embeddings_teacher_idx
  on planeacion_embeddings (teacher_id);
create index if not exists planeacion_embeddings_vec_idx
  on planeacion_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table planeacion_embeddings enable row level security;

drop policy if exists "own planeacion embeddings" on planeacion_embeddings;
create policy "own planeacion embeddings" on planeacion_embeddings
  for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));

-- Cosine-similarity match, scoped to one teacher and excluding the current plan.
-- security invoker (default) → RLS still applies, so a teacher only ever matches her own rows.
create or replace function match_planeaciones(
  query_embedding vector(1536),
  p_teacher_id uuid,
  exclude_fortnight uuid,
  match_count int
)
returns table (fortnight_id uuid, project_name text, content text, similarity float)
language sql
stable
as $$
  select e.fortnight_id, e.project_name, e.content,
         1 - (e.embedding <=> query_embedding) as similarity
  from planeacion_embeddings e
  where e.teacher_id = p_teacher_id
    and e.fortnight_id <> exclude_fortnight
    and e.embedding is not null
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
