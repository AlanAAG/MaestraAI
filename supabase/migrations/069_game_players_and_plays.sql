-- Home play: kids open the teacher's link, create a nickname-only profile (no email, no real
-- name — LFPDPPP: we never collect PII from minors) and their results are stored per profile.
-- A parent links the profile to their child ONCE with the 6-char code shown in the profile.

create table if not exists game_players (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  nickname     text not null check (char_length(nickname) between 1 and 24),
  avatar       text not null default '🐣',
  -- Short human-typable code the parent enters in /familia to claim this profile.
  code         text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  -- Set when a parent (or the teacher) links the profile to a real student.
  student_id   uuid references students(id) on delete set null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists game_players_teacher_idx on game_players(teacher_id);
create index if not exists game_players_student_idx on game_players(student_id);

create table if not exists game_plays (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references game_players(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  teacher_id  uuid not null references teachers(id) on delete cascade,
  correct     integer not null default 0 check (correct >= 0),
  total       integer not null default 0 check (total >= 0),
  duration_s  integer,
  -- Homework: did this run reach materials.homework_min_correct? null when not homework.
  passed      boolean,
  created_at  timestamptz not null default now()
);
create index if not exists game_plays_player_idx on game_plays(player_id, created_at desc);
create index if not exists game_plays_material_idx on game_plays(material_id, created_at desc);
create index if not exists game_plays_teacher_idx on game_plays(teacher_id, created_at desc);

-- Homework threshold: minimum aciertos to consider the game done (null = free play).
alter table materials add column if not exists homework_min_correct integer;
-- Teacher decides whether families see their child's game results at all.
alter table teachers add column if not exists share_game_scores boolean not null default true;

alter table game_players enable row level security;
alter table game_plays enable row level security;

-- Kids are anonymous: all writes go through the service role in the API. Reads are for the
-- owning teacher and for a parent with a claimed link to the linked student.
create policy game_players_teacher on game_players for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));

create policy game_players_parent on game_players for select
  using (
    student_id in (
      select student_id from parent_links
      where parent_auth_id = auth.uid() and claimed_at is not null and revoked_at is null
    )
  );

create policy game_plays_teacher on game_plays for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));

create policy game_plays_parent on game_plays for select
  using (
    player_id in (
      select p.id from game_players p
      join parent_links pl on pl.student_id = p.student_id
      where pl.parent_auth_id = auth.uid() and pl.claimed_at is not null and pl.revoked_at is null
    )
  );
