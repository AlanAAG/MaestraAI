-- Migration 010: Diary + School Network Infrastructure
-- Adds: diary sharing, school announcements, teacher resources, admin roles

-- Add share links and visibility to teacher_diary
ALTER TABLE teacher_diary
ADD COLUMN share_token TEXT UNIQUE,
ADD COLUMN share_expires_at TIMESTAMPTZ,
ADD COLUMN visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'school', 'shared_link'));

COMMENT ON COLUMN teacher_diary.share_token IS 'Random token for shareable links (7-day expiry)';
COMMENT ON COLUMN teacher_diary.visibility IS 'private: only teacher, school: all school teachers, shared_link: public via token';

-- School announcements table
CREATE TABLE school_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  author_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE school_announcements IS 'School-wide announcements from admins/coordinators';
COMMENT ON COLUMN school_announcements.priority IS 'urgent=red, high=yellow, normal=gray badge';

-- Shared resources table
CREATE TABLE teacher_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  resource_type TEXT CHECK (resource_type IN ('worksheet', 'game', 'flashcard', 'guide', 'template', 'other')),
  grade_level TEXT,
  tags TEXT[],
  downloads_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE teacher_resources IS 'Shared teaching resources (PDFs, worksheets, games) within a school';
COMMENT ON COLUMN teacher_resources.file_url IS 'Supabase Storage URL: school-resources/{school_id}/{resource_id}';

-- Teacher roles (add admin/coordinator roles)
ALTER TABLE teachers
ADD COLUMN role_type TEXT DEFAULT 'teacher' CHECK (role_type IN ('teacher', 'admin', 'coordinator'));

COMMENT ON COLUMN teachers.role_type IS 'admin: full school access, coordinator: announcement access, teacher: standard';

-- Create indexes for performance
CREATE INDEX idx_teacher_diary_visibility ON teacher_diary(visibility, teacher_id);
CREATE INDEX idx_teacher_diary_share_token ON teacher_diary(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_school_announcements_school ON school_announcements(school_id, published_at DESC);
-- Partial index for announcements with expiration dates only (excludes permanent announcements)
-- Query pattern: WHERE school_id = X AND expires_at > NOW() uses both indexes efficiently
CREATE INDEX idx_school_announcements_expiring ON school_announcements(school_id, expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_teacher_resources_school ON teacher_resources(school_id, created_at DESC);
CREATE INDEX idx_teacher_resources_tags ON teacher_resources USING GIN(tags);

-- RLS Policies for teacher_diary
-- Note: RLS already enabled in migration 004
-- Drop old policy and create granular policies for diary sharing

DROP POLICY IF EXISTS diary_own ON teacher_diary;

-- Teachers see own diaries + school-visible diaries from their school
CREATE POLICY "Teachers view own or school diaries" ON teacher_diary
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
    OR (visibility = 'school' AND teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.school_id = (SELECT school_id FROM teachers WHERE auth_id = auth.uid())
    ))
    OR (visibility = 'shared_link' AND share_expires_at > NOW())
  );

-- Teachers can only insert their own diaries
CREATE POLICY "Teachers insert own diaries" ON teacher_diary
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

-- Teachers can update their own diaries
CREATE POLICY "Teachers update own diaries" ON teacher_diary
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

-- Teachers can delete their own diaries
CREATE POLICY "Teachers delete own diaries" ON teacher_diary
  FOR DELETE USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

-- Admins see all diaries in their school
CREATE POLICY "Admins view all school diaries" ON teacher_diary
  FOR SELECT USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN teachers admin ON admin.school_id = t.school_id
      WHERE admin.auth_id = auth.uid() AND admin.role_type = 'admin'
    )
  );

-- RLS Policies for school_announcements
ALTER TABLE school_announcements ENABLE ROW LEVEL SECURITY;

-- Teachers view announcements from their school
CREATE POLICY "Teachers view school announcements" ON school_announcements
  FOR SELECT USING (
    school_id = (SELECT school_id FROM teachers WHERE auth_id = auth.uid())
  );

-- Only admins/coordinators can create announcements
CREATE POLICY "Admins create announcements" ON school_announcements
  FOR INSERT WITH CHECK (
    author_teacher_id IN (
      SELECT id FROM teachers WHERE auth_id = auth.uid() AND role_type IN ('admin', 'coordinator')
    )
  );

-- Only admins/coordinators can update announcements
CREATE POLICY "Admins update announcements" ON school_announcements
  FOR UPDATE USING (
    author_teacher_id IN (
      SELECT id FROM teachers WHERE auth_id = auth.uid() AND role_type IN ('admin', 'coordinator')
    )
  );

-- Only admins/coordinators can delete announcements
CREATE POLICY "Admins delete announcements" ON school_announcements
  FOR DELETE USING (
    author_teacher_id IN (
      SELECT id FROM teachers WHERE auth_id = auth.uid() AND role_type IN ('admin', 'coordinator')
    )
  );

-- RLS Policies for teacher_resources
ALTER TABLE teacher_resources ENABLE ROW LEVEL SECURITY;

-- Teachers view resources from their school
CREATE POLICY "Teachers view school resources" ON teacher_resources
  FOR SELECT USING (
    school_id = (SELECT school_id FROM teachers WHERE auth_id = auth.uid())
  );

-- Teachers can create resources in their school
CREATE POLICY "Teachers create resources" ON teacher_resources
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
    AND school_id = (SELECT school_id FROM teachers WHERE auth_id = auth.uid())
  );

-- Teachers can update their own resources
CREATE POLICY "Teachers update own resources" ON teacher_resources
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

-- Teachers can delete their own resources
CREATE POLICY "Teachers delete own resources" ON teacher_resources
  FOR DELETE USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

-- Admins can update any resource in their school
CREATE POLICY "Admins update school resources" ON teacher_resources
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM teachers WHERE auth_id = auth.uid() AND role_type = 'admin'
    )
  );

-- Admins can delete any resource in their school
CREATE POLICY "Admins delete school resources" ON teacher_resources
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM teachers WHERE auth_id = auth.uid() AND role_type = 'admin'
    )
  );
