# MaestraAI Setup Checklist

**Run through this checklist before your first test.**

## ✅ 1. Environment Variables

Create/verify `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

**Where to get these:**

- Supabase: Project Settings → API → URL & Keys
- Anthropic: console.anthropic.com → API Keys

## ✅ 2. Database Migrations

**In Supabase Dashboard → SQL Editor:**

Run each file in order (copy/paste entire file contents):

1. ✅ `001_core_tables.sql` - Creates schools, teachers, groups, students
2. ✅ `002_content_tables.sql` - Creates vocabulary, fortnights, lesson_plans, materials
3. ✅ `003_evaluation_tables.sql` - Creates teacher_observations, report_cards, teacher_diary
4. ✅ `004_rls_policies.sql` - Enables RLS on all tables
5. ✅ `005_usage_logs.sql` - Creates usage_logs table
6. ✅ `006_richmond_sync.sql` - Creates Richmond sync tables

**Verify migrations ran successfully:**

```sql
-- Run this query - should return all 17 tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected tables:

- groups
- group_teachers
- lesson_plans
- materials
- report_cards
- richmond_assignments
- richmond_credentials
- richmond_scores
- richmond_sync_log
- schools
- students
- teacher_diary
- teacher_observations
- teachers
- usage_logs
- vocabulary_items
- fortnights

## ✅ 3. Create Your Teacher Account

### Option A: Via UI (Recommended for first user)

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000
3. Click "Regístrate"
4. Fill in email + password (min 6 chars)
5. Check email for verification link (if email configured)
6. Log in
7. Complete onboarding wizard (name, grade, editorial)

**This automatically creates:**

- Auth user in Supabase Auth
- Teacher record with `auth_id` linked

### Option B: Manual SQL Setup

**Step 1: Create auth user in Supabase Auth dashboard**

- Go to Authentication → Users → Add User
- Enter email and password
- Copy the UUID (you'll need it)

**Step 2: Create teacher record**

```sql
-- Replace <YOUR_AUTH_UUID> with the UUID from step 1
INSERT INTO teachers (auth_id, email, full_name, role)
VALUES (
  '<YOUR_AUTH_UUID>',
  'alejandra@escuelamericana.mx',
  'Alejandra Garcia',
  'titular'
) RETURNING id;
-- Save the returned teacher ID
```

**Step 3: Create a school (if using seed data)**

```sql
INSERT INTO schools (id, name, city, state)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Escuela Americana',
  'Ciudad de México',
  'CDMX'
);
```

**Step 4: Create a group**

```sql
-- Replace <TEACHER_ID> with ID from step 2
INSERT INTO groups (
  id, school_id, titular_teacher_id,
  name, grade, academic_year
)
VALUES (
  '91000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  '<TEACHER_ID>',
  'Preprimaria A',
  'Kinder 3',
  '2025-2026'
);
```

## ✅ 4. Optional: Seed Vocabulary

**For letter-based lesson planning:**

```sql
-- Run this file (129 words)
\i supabase/seeds/vocabulary_seed.sql
```

Or run it from the file in SQL Editor.

## ✅ 5. Optional: Seed Full Demo Data

**For complete testing with students:**

```sql
-- After creating auth user, run:
\i supabase/seed_step2.sql
```

This creates:

- Teacher record (you'll need to update auth_id to match your user)
- 2 groups (Preprimaria A & B)
- 24 students (12 per group)

**IMPORTANT:** Update the auth_id in seed_step2.sql:

```sql
-- Line 12-13 - change this UUID to yours
INSERT INTO teachers (id, auth_id, school_id, full_name, email, role)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '4acb9c3c-f9fa-4520-be97-0cf1b19d1928',  -- ← CHANGE THIS
  ...
```

## ✅ 6. Verify Setup

Run these verification queries in Supabase SQL Editor:

**Check your teacher record exists:**

```sql
SELECT * FROM teachers WHERE email = 'your@email.com';
-- Should return 1 row with your auth_id
```

**Check your auth_id matches:**

```sql
-- Replace <YOUR_EMAIL> with your login email
SELECT
  (SELECT id FROM auth.users WHERE email = '<YOUR_EMAIL>') as auth_id,
  t.auth_id as teacher_auth_id,
  t.auth_id = (SELECT id FROM auth.users WHERE email = '<YOUR_EMAIL>') as ids_match
FROM teachers t
WHERE t.email = '<YOUR_EMAIL>';
-- ids_match should be TRUE
```

**Check you have a group:**

```sql
SELECT * FROM groups WHERE titular_teacher_id = (
  SELECT id FROM teachers WHERE email = 'your@email.com'
);
-- Should return at least 1 row
```

## ✅ 7. Test Build

Before deploying:

```bash
npm run build
```

Should complete without errors. If errors appear, fix before deploying.

## ✅ 8. Ready to Test

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 and follow the testing checklist in `TESTING.md`.

**Open DevTools Console (F12) and keep it visible during testing.**

---

## Quick Troubleshooting

**"Stuck on loading..."**
→ Open console, look for errors, check TESTING.md debugging section

**"No teacher found"**
→ Run verification query above, check auth_id matches

**"Table does not exist"**
→ Run migrations 001-006 in order

**"RLS policy violation"**
→ Verify teacher.auth_id = auth.users.id for your account

**Build fails**
→ Check all .env.local variables are set
→ Run `npm install` to ensure dependencies are current
