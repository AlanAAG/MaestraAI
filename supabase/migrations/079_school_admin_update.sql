-- Admins can update their own school (slug, name) — there was no UPDATE policy at all.
drop policy if exists school_admin_update on schools;
create policy school_admin_update on schools for update
  using (id in (select school_id from teachers where auth_id = auth.uid() and role_type = 'admin'))
  with check (id in (select school_id from teachers where auth_id = auth.uid() and role_type = 'admin'));
