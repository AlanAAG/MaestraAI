-- Director oversight: role_type='admin' can READ (never write) the content of teachers in
-- their own school. Same self-join pattern as "Admins view all school diaries" (010).
-- `students` is deliberately excluded — encrypted-name PII stays teacher-only.

create policy fortnights_school_admin_select on fortnights for select using (
  teacher_id in (
    select t.id from teachers t
    join teachers a on a.school_id = t.school_id
    where a.auth_id = auth.uid() and a.role_type = 'admin' and t.school_id is not null
  )
);

create policy lesson_plans_school_admin_select on lesson_plans for select using (
  teacher_id in (
    select t.id from teachers t
    join teachers a on a.school_id = t.school_id
    where a.auth_id = auth.uid() and a.role_type = 'admin' and t.school_id is not null
  )
);

create policy materials_school_admin_select on materials for select using (
  teacher_id in (
    select t.id from teachers t
    join teachers a on a.school_id = t.school_id
    where a.auth_id = auth.uid() and a.role_type = 'admin' and t.school_id is not null
  )
);

create policy group_posts_school_admin_select on group_posts for select using (
  teacher_id in (
    select t.id from teachers t
    join teachers a on a.school_id = t.school_id
    where a.auth_id = auth.uid() and a.role_type = 'admin' and t.school_id is not null
  )
);

create policy groups_school_admin_select on groups for select using (
  school_id in (
    select school_id from teachers where auth_id = auth.uid() and role_type = 'admin'
  )
);
