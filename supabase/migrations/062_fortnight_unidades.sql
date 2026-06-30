-- Teacher-defined didactic units per quincena. Each unit = a methodology + name (+ optional
-- tema/días/libros). Unit[0] drives the top-level Proyecto; the rest flow through the existing
-- custom sub-plan pipeline. JSONB to match observation_calendar / richmond_book_pages.
-- Additive + nullable: the nueva form spreads it conditionally, so it works before this is pushed.
alter table fortnights add column if not exists unidades_didacticas jsonb;
