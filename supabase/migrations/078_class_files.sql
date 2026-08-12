-- Files: attachments on group posts + homework submissions from families.
-- Private bucket; ALL reads/writes go through APIs with membership checks + signed URLs.
insert into storage.buckets (id, name, public)
values ('class-files', 'class-files', false)
on conflict (id) do nothing;

alter table group_posts add column if not exists attachments jsonb;

create table if not exists task_submissions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references group_posts(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  uploaded_by uuid not null,
  file_path   text not null,
  file_name   text not null check (char_length(file_name) between 1 and 160),
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now()
);
create index if not exists task_submissions_post_idx on task_submissions (post_id, created_at desc);

alter table task_submissions enable row level security;

-- Teacher who owns the post sees every submission.
create policy task_submissions_teacher on task_submissions for select
  using (post_id in (select id from group_posts where teacher_id in (select id from teachers where auth_id = auth.uid())));

-- Parents: manage submissions for their own linked child only.
create policy task_submissions_parent on task_submissions for all
  using (
    uploaded_by = auth.uid()
    and student_id in (
      select student_id from parent_links
      where parent_auth_id = auth.uid() and claimed_at is not null and revoked_at is null
    )
  )
  with check (
    uploaded_by = auth.uid()
    and student_id in (
      select student_id from parent_links
      where parent_auth_id = auth.uid() and claimed_at is not null and revoked_at is null
    )
  );
