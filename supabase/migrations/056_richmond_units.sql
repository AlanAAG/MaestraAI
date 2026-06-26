-- Richmond Unit Overview: pre-seeded English book content (units + lesson groups) that teachers
-- select when creating a planeación, so the AI generates PRONI activities/games using the exact
-- book vocabulary. Read-only reference catalog (no scraping, no runtime writes).

create table if not exists richmond_units (
  id          uuid primary key default gen_random_uuid(),
  book_code   text not null,
  unit_number smallint not null,
  unit_title  text not null,
  created_at  timestamptz default now(),
  unique (book_code, unit_number)
);

create table if not exists richmond_lesson_groups (
  id              uuid primary key default gen_random_uuid(),
  unit_id         uuid references richmond_units(id) on delete cascade,
  lesson_range    text not null,
  lesson_start    smallint not null,
  lesson_end      smallint not null,
  learning_goals  text[] not null default '{}',
  vocabulary      text[] not null default '{}',
  language_models text[] not null default '{}',
  sort_order      smallint not null,
  unique (unit_id, lesson_range)  -- idempotent seeding
);
create index if not exists richmond_lesson_groups_unit_idx on richmond_lesson_groups (unit_id);

-- Public read (reference catalog, no sensitive data). No write policy → only the service role
-- (used by the seed script) can write.
alter table richmond_units enable row level security;
alter table richmond_lesson_groups enable row level security;

drop policy if exists richmond_units_public_read on richmond_units;
create policy richmond_units_public_read on richmond_units for select using (true);

drop policy if exists richmond_lesson_groups_public_read on richmond_lesson_groups;
create policy richmond_lesson_groups_public_read on richmond_lesson_groups for select using (true);

-- Fortnight stores the teacher's selection (additive, graceful — generation degrades to today's
-- behavior when null).
alter table fortnights add column if not exists richmond_unit_id uuid references richmond_units(id) on delete set null;
alter table fortnights add column if not exists richmond_lesson_group_ids uuid[];
