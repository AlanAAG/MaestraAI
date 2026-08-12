-- Classroom-style group wall: announcements + tareas (assigned materials), emailed to families.
create table if not exists group_posts (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references teachers(id) on delete cascade,
  group_id    uuid not null references groups(id) on delete cascade,
  kind        text not null check (kind in ('anuncio', 'tarea')),
  title       text not null check (char_length(title) between 1 and 200),
  body        text check (char_length(body) <= 5000),
  material_id uuid references materials(id) on delete set null,
  due_date    date,
  created_at  timestamptz not null default now()
);
create index if not exists group_posts_group_idx on group_posts (group_id, created_at desc);
create index if not exists group_posts_teacher_idx on group_posts (teacher_id, created_at desc);

-- Send log: "enviado a N de M familias" per post.
create table if not exists group_post_emails (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references group_posts(id) on delete cascade,
  sent       int not null default 0,
  total      int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists group_post_emails_post_idx on group_post_emails (post_id);

alter table group_posts enable row level security;
alter table group_post_emails enable row level security;

create policy group_posts_teacher on group_posts for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));

-- Parents with a live claimed link to a student of the group can read its wall.
create policy group_posts_parent on group_posts for select
  using (
    group_id in (
      select s.group_id from students s
      join parent_links pl on pl.student_id = s.id
      where pl.parent_auth_id = auth.uid() and pl.claimed_at is not null and pl.revoked_at is null
    )
  );

create policy group_post_emails_teacher on group_post_emails for select
  using (post_id in (select id from group_posts where teacher_id in (select id from teachers where auth_id = auth.uid())));
