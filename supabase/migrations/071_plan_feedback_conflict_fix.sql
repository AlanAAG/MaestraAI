-- 070's partial unique indexes can't be targeted by PostgREST upserts (42P10): ON CONFLICT
-- only infers a partial index with an inline WHERE predicate, which the API can't send.
-- Fix: sentinel '' = global feedback, single plain unique index as the one conflict target.
delete from plan_feedback; -- table is hours old and empty in prod; safe
drop index if exists plan_feedback_global_uniq;
drop index if exists plan_feedback_section_uniq;
alter table plan_feedback alter column section_key set default '';
update plan_feedback set section_key = '' where section_key is null;
alter table plan_feedback alter column section_key set not null;
create unique index if not exists plan_feedback_uniq
  on plan_feedback (fortnight_id, teacher_id, section_key);
