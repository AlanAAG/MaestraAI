-- Format sharing within a school.
-- A teacher can share their own format with their school; other teachers in the same school can
-- then SEE and USE it (but not edit/delete it). Admins can additionally flag a format as the
-- official "Formato de la escuela". Writes stay own-only (the existing FOR ALL policy); we only
-- ADD a permissive SELECT policy for school-shared rows (multiple permissive policies OR together).

alter table teacher_plan_templates
  add column if not exists school_id uuid references schools(id) on delete cascade,
  add column if not exists shared_with_school boolean not null default false,
  add column if not exists is_school_official boolean not null default false;

-- Backfill school_id from the owning teacher so existing rows can be shared.
update teacher_plan_templates t
set school_id = te.school_id
from teachers te
where t.teacher_id = te.id and t.school_id is null;

-- Visibility: a teacher can read a template shared with their school (in addition to their own,
-- which the existing teacher_plan_templates_own FOR ALL policy already covers).
drop policy if exists teacher_plan_templates_school_shared on teacher_plan_templates;
create policy teacher_plan_templates_school_shared on teacher_plan_templates
  for select using (
    shared_with_school = true
    and school_id is not null
    and school_id in (select school_id from teachers where auth_id = auth.uid())
  );

create index if not exists idx_tpt_school_shared
  on teacher_plan_templates (school_id, plan_type)
  where shared_with_school = true;
