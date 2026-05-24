CREATE TABLE vocabulary_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter     CHAR(1) NOT NULL,
  word       TEXT NOT NULL,
  color_code TEXT NOT NULL,
  color_hex  TEXT NOT NULL,
  pair_index INT NOT NULL,
  UNIQUE(letter, word)
);

CREATE TABLE fortnights (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  teacher_id              UUID REFERENCES teachers(id) NOT NULL,
  number                  INT NOT NULL,
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  monthly_value           TEXT,
  project_name            TEXT,
  letter_week1            TEXT,
  letter_week2            TEXT,
  number_range_week1      TEXT,
  number_range_week2      TEXT,
  richmond_unit           TEXT,
  richmond_student_pages  TEXT,
  richmond_activity_pages TEXT,
  methodology_types       TEXT[],
  nem_ejes                TEXT[],
  status                  TEXT DEFAULT 'draft',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lesson_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fortnight_id         UUID REFERENCES fortnights(id) ON DELETE CASCADE NOT NULL,
  teacher_id           UUID REFERENCES teachers(id) NOT NULL,
  day_number           INT NOT NULL,
  date                 DATE,
  day_of_week          TEXT,
  methodology          TEXT,
  blocks               JSONB NOT NULL,
  nem_alignment        JSONB,
  evaluation_rubric    JSONB,
  youtube_videos       JSONB,
  observation_students TEXT[],
  nee_reminders        TEXT[],
  generated_by         TEXT DEFAULT 'claude',
  approved             BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE materials (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  fortnight_id   UUID REFERENCES fortnights(id),
  lesson_plan_id UUID REFERENCES lesson_plans(id),
  type           TEXT NOT NULL,
  letter         CHAR(1),
  vocabulary     JSONB,
  content        JSONB NOT NULL,
  source_url     TEXT,
  source_type    TEXT,
  is_projectable BOOLEAN DEFAULT FALSE,
  generated_at   TIMESTAMPTZ DEFAULT NOW()
);
