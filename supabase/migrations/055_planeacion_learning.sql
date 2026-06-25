-- Self-improving planeaciones: capture teacher edits as a correction memory + an evolving
-- distilled style profile. Additive; RLS owner-only; degrades gracefully until pushed.

-- 1. Correction memory: every inline edit's original→edited text (the strongest accuracy signal).
create table if not exists plan_corrections (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  fortnight_id uuid references fortnights(id) on delete set null,
  section      text not null,
  original     text,
  edited       text,
  created_at   timestamptz default now()
);
create index if not exists plan_corrections_teacher_idx
  on plan_corrections (teacher_id, created_at desc);

alter table plan_corrections enable row level security;
drop policy if exists "own plan corrections" on plan_corrections;
create policy "own plan corrections" on plan_corrections
  for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));

-- 2. Evolving distilled style profile (refreshed from her edited plans + corrections).
create table if not exists teacher_learned_profile (
  teacher_id   uuid not null references teachers(id) on delete cascade,
  plan_type    text not null default 'quincena',
  profile      jsonb not null default '{}'::jsonb,  -- TeacherProfile-shaped (writing_style_samples…)
  preferences  text,                                 -- short distilled "what she changes/prefers/avoids"
  source_count int default 0,                        -- plans + corrections it was distilled from
  refreshed_at timestamptz default now(),
  primary key (teacher_id, plan_type)
);

alter table teacher_learned_profile enable row level security;
drop policy if exists "own learned profile" on teacher_learned_profile;
create policy "own learned profile" on teacher_learned_profile
  for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));
