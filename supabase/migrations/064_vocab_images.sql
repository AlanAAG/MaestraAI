-- Per-word teacher-uploaded images. Stored in a public Storage bucket; the URL lives on the word.
-- Uploads go through a server route using the service role (ownership-checked), so no per-object
-- RLS policies are needed here — the bucket is public-read and writes bypass RLS server-side.
alter table vocabulary_items add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('vocab-images', 'vocab-images', true)
on conflict (id) do nothing;
