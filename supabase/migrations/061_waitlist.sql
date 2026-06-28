-- Pre-launch waitlist capture (public form). Written by the service role only; no public read
-- (emails are private). Position is derived from row count; referred_by + ref_code support a
-- future referral loop (we store the data now, rewards are fulfilled manually for launch).
create table if not exists waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  grade       text,
  ref_code    text unique,
  referred_by uuid references waitlist(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table waitlist enable row level security;
-- No anon/auth policies → only the service role (the API) can read/write. Form posts go through
-- /api/waitlist which uses the service key.
