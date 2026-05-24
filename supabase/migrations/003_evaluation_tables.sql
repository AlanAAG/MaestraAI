CREATE TABLE teacher_observations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  teacher_id      UUID REFERENCES teachers(id) NOT NULL,
  lesson_plan_id  UUID REFERENCES lesson_plans(id),
  observed_date   DATE NOT NULL,
  notes_encrypted TEXT,
  rubric_results  JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, observed_date, teacher_id)
);

CREATE TABLE report_cards (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             UUID REFERENCES students(id) NOT NULL,
  teacher_id             UUID REFERENCES teachers(id) NOT NULL,
  trimester              INT NOT NULL,
  academic_year          TEXT NOT NULL,
  lenguajes_obs          TEXT,
  saberes_obs            TEXT,
  etica_obs              TEXT,
  humano_comunitario_obs TEXT,
  english_specific_obs   TEXT,
  nee_progress_obs       TEXT,
  pdf_storage_path       TEXT,
  status                 TEXT DEFAULT 'draft',
  approved_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teacher_diary (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  week_start     DATE NOT NULL,
  week_end       DATE NOT NULL,
  q1_functioning TEXT,
  q2_challenging TEXT,
  q3_group       TEXT,
  q4_adjust      TEXT,
  q5_student_obs TEXT,
  ai_summary     TEXT,
  source         TEXT DEFAULT 'main_app',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, week_start)
);
