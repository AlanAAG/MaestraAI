-- Undo for chat edits.
--
-- The chat is used to fix mistakes and try things out, so a bad edit has to be
-- reversible or the teacher won't experiment. Each assistant turn that changed
-- the document carries the plan_document as it was BEFORE that turn; restoring
-- is a straight write-back.
--
-- Whole-document snapshot rather than per-section: one turn can edit several
-- sections, add one and remove another, and _section_order moves with them.
-- Reversing that piecemeal is where corruption would come from.
alter table plan_chat_messages
  add column if not exists plan_snapshot jsonb;

-- Set once a turn is undone, so the button disappears and a double-undo can't
-- resurrect stale content on top of newer edits.
alter table plan_chat_messages
  add column if not exists undone_at timestamptz;

comment on column plan_chat_messages.plan_snapshot is
  'plan_document before this assistant turn ran. Null for turns that changed nothing.';
