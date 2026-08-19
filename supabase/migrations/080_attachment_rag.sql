-- RAG over plan attachments: full-document chunks + embeddings, keyed by the upload path so
-- retrieval needs no linking step (fortnights.attachment_context carries the keys).
create table if not exists plan_attachment_chunks (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid not null references teachers(id) on delete cascade,
  attachment_key text not null,
  idx            int not null,
  content        text not null,
  embedding      vector(1536),
  created_at     timestamptz not null default now()
);
create index if not exists plan_attachment_chunks_key_idx on plan_attachment_chunks (attachment_key);
create index if not exists plan_attachment_chunks_teacher_idx on plan_attachment_chunks (teacher_id);

alter table plan_attachment_chunks enable row level security;
create policy plan_attachment_chunks_teacher on plan_attachment_chunks for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));

-- Top-k similar chunks among the given attachment keys (SECURITY definer not needed: called
-- with service role from the generation route).
create or replace function match_attachment_chunks(
  query_embedding vector(1536),
  p_teacher uuid,
  p_keys text[],
  match_count int default 6
) returns table (content text, attachment_key text, similarity float)
language sql stable as $$
  select c.content, c.attachment_key, 1 - (c.embedding <=> query_embedding) as similarity
  from plan_attachment_chunks c
  where c.teacher_id = p_teacher
    and c.attachment_key = any(p_keys)
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count
$$;
