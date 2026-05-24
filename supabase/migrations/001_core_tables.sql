CREATE TABLE schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  city       TEXT DEFAULT 'CDMX',
  plan       TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teachers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id                   UUID REFERENCES schools(id),
  full_name                   TEXT NOT NULL,
  email                       TEXT NOT NULL UNIQUE,
  role                        TEXT DEFAULT 'titular',
  subject                     TEXT,
  richmond_email_encrypted    TEXT,
  richmond_password_encrypted TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE groups (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                   UUID REFERENCES schools(id) NOT NULL,
  titular_teacher_id          UUID REFERENCES teachers(id) NOT NULL,
  name                        TEXT NOT NULL,
  grade                       TEXT DEFAULT 'Kinder 3',
  academic_year               TEXT NOT NULL,
  richmond_class_code         TEXT,
  richmond_course_module_uuid TEXT,
  fixed_weekly_schedule       JSONB,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_teachers (
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  day_of_week TEXT[],
  time_slot   TEXT,
  PRIMARY KEY (group_id, teacher_id, subject)
);

CREATE TABLE students (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                 UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  display_name             TEXT NOT NULL,
  first_name_encrypted     TEXT NOT NULL,
  last_name_encrypted      TEXT NOT NULL,
  richmond_username        TEXT,
  richmond_student_id      TEXT,
  level                    TEXT DEFAULT 'medio',
  observation_day          TEXT,
  has_nee                  BOOLEAN DEFAULT FALSE,
  special_needs_encrypted  TEXT,
  parent_contact_encrypted TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
