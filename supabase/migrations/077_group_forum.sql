-- Group forum: families post dudas, the teacher (or other families) reads; teacher replies.
create table if not exists group_questions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  teacher_id  uuid not null references teachers(id) on delete cascade,
  author_auth uuid not null,
  author_name text not null check (char_length(author_name) between 1 and 80),
  body        text not null check (char_length(body) between 1 and 2000),
  reply_to    uuid references group_questions(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists group_questions_group_idx on group_questions (group_id, created_at);

alter table group_questions enable row level security;

-- Teacher of the group: full control.
create policy group_questions_teacher on group_questions for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));

-- Parents with a live claimed link to a student of the group: read the forum, post as themselves.
create policy group_questions_parent_read on group_questions for select
  using (
    group_id in (
      select s.group_id from students s
      join parent_links pl on pl.student_id = s.id
      where pl.parent_auth_id = auth.uid() and pl.claimed_at is not null and pl.revoked_at is null
    )
  );
create policy group_questions_parent_write on group_questions for insert
  with check (
    author_auth = auth.uid()
    and group_id in (
      select s.group_id from students s
      join parent_links pl on pl.student_id = s.id
      where pl.parent_auth_id = auth.uid() and pl.claimed_at is not null and pl.revoked_at is null
    )
  );
