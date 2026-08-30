-- Enfoque pedagógico: the classroom philosophy a plan is written through
-- (DUA, Montessori, Reggio, Waldorf, High Scope, socioemocional, indagación…).
--
-- Orthogonal to the per-unit `metodologia` inside unidades_didacticas: that one
-- picks the didactic STRUCTURE (which fases become headings, fixed by SEP), while
-- this shapes HOW the activities inside that structure are conceived. A plan can
-- be a Taller Crítico written through a Montessori lens.
--
-- Plan-level rather than per-unit: a school's pedagogical approach applies to the
-- whole classroom, not to one activity. Nullable — existing plans and anyone who
-- doesn't pick one stay on plain NEM (slug 'nem'), which is the same thing.
alter table fortnights
  add column if not exists pedagogical_approach text;

comment on column fortnights.pedagogical_approach is
  'Enfoque slug from lib/planner/enfoques.ts. Null / ''nem'' = no additional lens.';
