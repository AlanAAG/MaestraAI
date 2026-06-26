-- Planeaciones are per-GRADE (inclusive of all groups of that grade), not per-group.
-- We add `grade` as the scoping field and KEEP `group_id` as a representative group of the
-- grade — it still provides the weekly schedule (groups.fixed_weekly_schedule) and a valid FK,
-- so existing joins keep working. Generation fans out to every group of the grade.
alter table fortnights add column if not exists grade text;

-- Backfill existing rows from their (single) group so older planeaciones keep a grade label.
update fortnights f
set grade = g.grade
from groups g
where f.group_id = g.id and f.grade is null;
