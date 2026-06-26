-- Track whether a Richmond teacher's vocabulary has been auto-seeded from the book catalog.
-- Null = not yet seeded. Set to now() after the first seed on vocab page load.
alter table teachers add column if not exists richmond_vocab_seeded_at timestamptz;
