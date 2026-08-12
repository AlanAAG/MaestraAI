-- Numbers to work per week (mirrors letter_week1-4). Free text: "1-10", "50, 51, 52", etc.
-- Drives the Números sub-plan the same way letters drive the Letters sub-plan.
alter table fortnights add column if not exists number_week1 text;
alter table fortnights add column if not exists number_week2 text;
alter table fortnights add column if not exists number_week3 text;
alter table fortnights add column if not exists number_week4 text;
