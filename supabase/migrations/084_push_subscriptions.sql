-- Web Push: one row per browser that opted in (parents in /familia, teachers later).
-- Keyed by auth id — works for parents (no teachers row) and teachers alike.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  auth_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_auth_idx on push_subscriptions (auth_id);

alter table push_subscriptions enable row level security;

-- Owner manages their own subscriptions; sends happen via service role.
create policy push_subscriptions_owner on push_subscriptions for all
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());
