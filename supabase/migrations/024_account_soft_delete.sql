ALTER TABLE teachers ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_teachers_deleted_at ON teachers(deleted_at) WHERE deleted_at IS NOT NULL;
