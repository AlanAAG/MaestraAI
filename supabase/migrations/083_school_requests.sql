-- Teacher → dirección requests (material, presupuesto, otros). Immutable once filed
-- (no teacher update/delete policies); dirección resolves them with a response.
create table if not exists school_requests (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references schools(id) on delete cascade,
  teacher_id     uuid not null references teachers(id) on delete cascade,
  kind           text not null check (kind in ('material', 'budget', 'other')),
  title          text not null check (char_length(title) between 1 and 200),
  body           text check (char_length(body) <= 5000),
  amount         numeric(10,2) check (amount is null or amount >= 0),
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_response text check (char_length(admin_response) <= 2000),
  resolved_by    uuid references teachers(id) on delete set null,
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists school_requests_school_idx on school_requests (school_id, created_at desc);
create index if not exists school_requests_teacher_idx on school_requests (teacher_id, created_at desc);

alter table school_requests enable row level security;

-- Teachers: file into their own school, read their own requests.
create policy school_requests_teacher_insert on school_requests for insert with check (
  teacher_id in (select id from teachers where auth_id = auth.uid())
  and school_id in (select school_id from teachers where auth_id = auth.uid())
);
create policy school_requests_teacher_select on school_requests for select using (
  teacher_id in (select id from teachers where auth_id = auth.uid())
);

-- Dirección: read + resolve everything in their school.
create policy school_requests_admin_select on school_requests for select using (
  school_id in (select school_id from teachers where auth_id = auth.uid() and role_type = 'admin')
);
create policy school_requests_admin_update on school_requests for update
  using (school_id in (select school_id from teachers where auth_id = auth.uid() and role_type = 'admin'))
  with check (school_id in (select school_id from teachers where auth_id = auth.uid() and role_type = 'admin'));
