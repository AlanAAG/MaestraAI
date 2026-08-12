-- School environment: public slug (portal path /escuela/<slug>) + email allowlist so directors
-- invite teacher/admin emails before those accounts exist.
alter table schools add column if not exists slug text unique
  check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}$');

create table if not exists school_invites (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  email      text not null,
  role       text not null default 'teacher' check (role in ('teacher', 'admin', 'coordinator')),
  invited_by uuid references teachers(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists school_invites_uniq on school_invites (school_id, lower(email));
create index if not exists school_invites_email_idx on school_invites (lower(email));

alter table school_invites enable row level security;

-- Only admins of the school manage its allowlist. Claims happen server-side (service role).
create policy school_invites_admin on school_invites for all
  using (school_id in (select school_id from teachers where auth_id = auth.uid() and role_type = 'admin'))
  with check (school_id in (select school_id from teachers where auth_id = auth.uid() and role_type = 'admin'));
