-- Teacher's choice at plan creation: one combined document (default) or separate
-- planeaciones — principal (sin Letters/Números), Letters, and Números.
alter table fortnights add column if not exists split_documents boolean not null default false;
