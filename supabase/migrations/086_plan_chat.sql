-- Conversational editing of a generated planeación: the teacher chats with the
-- assistant to refine the draft after the first generation.
--
-- plan_feedback (070) can't hold this — it's one upsert row per (plan, teacher,
-- section) and deliberately keeps only the latest comment. A conversation needs
-- ordered, append-only turns.
--
-- Additive; RLS owner-only (same pattern as plan_feedback 070 / plan_corrections 055).

create table if not exists plan_chat_messages (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  fortnight_id uuid not null references fortnights(id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null check (char_length(content) <= 20000),
  -- plan_document keys this turn rewrote; empty for a purely conversational reply.
  -- Lets the UI show "editó: proyecto, pausas_activas" without re-diffing the doc.
  edited_sections text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- The only read pattern: one conversation, in order.
create index if not exists plan_chat_messages_thread_idx
  on plan_chat_messages (fortnight_id, teacher_id, created_at);

alter table plan_chat_messages enable row level security;

create policy plan_chat_messages_own on plan_chat_messages for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));
