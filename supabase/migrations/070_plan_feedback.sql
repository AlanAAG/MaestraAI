-- Explicit teacher feedback on generated planeaciones: a global rating+comment per plan and
-- Word-style comments per section. Feeds the learning distiller (lib/planner/learning.ts) and
-- the regenerate-section flow. Additive; RLS owner-only (same pattern as plan_corrections 055).

create table if not exists plan_feedback (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  fortnight_id uuid not null references fortnights(id) on delete cascade,
  -- null = global feedback for the whole document; else a plan_document section key.
  section_key  text,
  -- 1-5, global rows only (the teacher rating the AI — not a student grade).
  rating       int check (rating between 1 and 5),
  comment      text check (char_length(comment) <= 2000),
  -- Reserved for future retrieval (approach B in the spec). Unused today.
  embedding    vector(1536),
  created_at   timestamptz not null default now(),
  check (rating is not null or comment is not null)
);

-- Upsert targets: one global row per (plan, teacher); latest comment per section wins.
create unique index if not exists plan_feedback_global_uniq
  on plan_feedback (fortnight_id, teacher_id) where section_key is null;
create unique index if not exists plan_feedback_section_uniq
  on plan_feedback (fortnight_id, teacher_id, section_key) where section_key is not null;
create index if not exists plan_feedback_teacher_idx
  on plan_feedback (teacher_id, created_at desc);

alter table plan_feedback enable row level security;
drop policy if exists "own plan feedback" on plan_feedback;
create policy "own plan feedback" on plan_feedback
  for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));
