# MaestraAI Testing Guide

## Critical Issue Fixed: Planeaciones Infinite Loading

### The Problem

The planeaciones page was stuck in infinite loading because:

1. **Missing error handling** - queries failed silently without setting `loading = false`
2. **No console logging** - errors were invisible, making debugging impossible
3. **Implicit RLS filtering** - code relied on RLS policies instead of explicit queries
4. **Potential missing migrations** - if tables don't exist, queries fail silently

### What Was Fixed

All data-fetching pages now have:

- ✅ Comprehensive try/catch blocks
- ✅ Error logging to browser console
- ✅ Explicit error checks for each query
- ✅ Guaranteed `setLoading(false)` even on errors
- ✅ Explicit teacher_id filtering in queries

**Files updated:**

- `app/(main)/planeaciones/page.tsx` - list view
- `app/(main)/planeaciones/[id]/page.tsx` - detail view
- `app/(main)/dashboard/page.tsx` - dashboard
- `app/(main)/configuracion/page.tsx` - settings

## CRITICAL: Before Testing

### 1. Run Database Migrations

**The app WILL NOT WORK without running migrations first.**

Open Supabase SQL Editor and run in order:

```bash
# In Supabase Dashboard → SQL Editor → New Query
# Run each migration file in order:

-- 001_core_tables.sql
-- 002_content_tables.sql
-- 003_evaluation_tables.sql
-- 004_rls_policies.sql
-- 005_usage_logs.sql
-- 006_richmond_sync.sql
```

After running migrations, regenerate types:

```bash
supabase gen types typescript --local > lib/database.types.ts
```

### 2. Seed Required Data

**Minimum data needed to test:**

```sql
-- Create a teacher record for your auth user
INSERT INTO teachers (auth_id, email, full_name, role)
VALUES (
  '<YOUR_AUTH_UUID>',  -- Get from Supabase Auth dashboard
  'your@email.com',
  'Your Name',
  'titular'
);

-- Create a group (required for fortnights)
INSERT INTO groups (id, school_id, titular_teacher_id, name, grade, academic_year)
VALUES (
  '91000000-0000-0000-0000-000000000001',
  '<SCHOOL_ID>',  -- Create a school first if needed
  '<TEACHER_ID>',  -- ID from teachers table
  'Kinder 3A',
  'Kinder 3',
  '2025-2026'
);
```

### 3. Check Environment Variables

Verify `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Testing Checklist

### Phase 1: Auth Flow

- [ ] Navigate to http://localhost:3000
- [ ] Should redirect to /dashboard (not show Next.js template)
- [ ] If not logged in, redirect to /login
- [ ] **Open browser DevTools → Console** (keep this open for all tests)
- [ ] Try logging in with valid credentials
- [ ] Check console for any auth errors
- [ ] Should redirect to /dashboard on success

### Phase 2: Dashboard

- [ ] Dashboard loads without infinite spinner
- [ ] If no teacher record: shows "Completa tu perfil" zero state
- [ ] If teacher exists: shows greeting with name
- [ ] Cards for Planeaciones, Boletas, Richmond visible
- [ ] **Check console** - should see no errors
- [ ] If errors appear, note the exact message

### Phase 3: Planeaciones (The Critical Test)

- [ ] Click "Planeaciones" in sidebar
- [ ] Page should load (not infinite spinner)
- [ ] **Check console immediately** - look for errors:
  - `Auth error:` - auth is broken
  - `Teacher query error:` - no teacher record found
  - `Fortnights query error:` - table doesn't exist or RLS blocking

**If zero state shows** (no planeaciones):

- [ ] This is CORRECT if you haven't created any
- [ ] Click "Nueva Planeación"
- [ ] Fill out the form (all fields required)
- [ ] Submit
- [ ] Should redirect to detail page
- [ ] **Check console** - look for "Fortnight query error"

**If infinite loading:**

- [ ] Open DevTools Console
- [ ] Look for red error messages
- [ ] Common issues:
  - "relation 'fortnights' does not exist" → Run migrations
  - "row-level security policy" → Teacher record not linked to auth
  - "teacher_id" errors → Teacher record missing

### Phase 4: Planeación Detail

- [ ] After creating a planeación, detail page should load
- [ ] Should show fortnight header with dates
- [ ] Should show "Planeación lista para generar" card
- [ ] Click "Generar Planeación"
- [ ] Should see loading phases: Preparando → Analizando → Generando
- [ ] **This requires ANTHROPIC_API_KEY** - will fail without it
- [ ] **Check console** for Claude API errors

### Phase 5: Configuración

- [ ] Click Configuración in nav
- [ ] Should load without errors
- [ ] If teacher exists: shows current name
- [ ] Try updating name → Save
- [ ] Should show success message
- [ ] **Check console** for any errors

## Debugging Guide

### Console Error Reference

| Error Message                                     | Meaning               | Fix                                       |
| ------------------------------------------------- | --------------------- | ----------------------------------------- |
| `Auth error: ...`                                 | Supabase auth failing | Check .env.local keys, verify user exists |
| `Teacher query error: ...`                        | No teacher record     | Create teacher record in Supabase         |
| `Fortnights query error: relation does not exist` | Migrations not run    | Run all migrations in order               |
| `Fortnights query error: row-level security`      | RLS blocking query    | Verify teacher.auth_id matches user.id    |
| `No user found`                                   | User logged out       | Log in again                              |
| `No teacher record found for user`                | Missing teacher       | Create teacher with matching auth_id      |

### Common Setup Issues

**1. Infinite loading on planeaciones**

```sql
-- Check if fortnights table exists
SELECT * FROM fortnights LIMIT 1;

-- If error "relation does not exist":
-- → Run migration 002_content_tables.sql

-- Check if teacher exists
SELECT * FROM teachers WHERE auth_id = '<YOUR_AUTH_UUID>';

-- If no rows:
-- → Run seed_step2.sql or create teacher manually
```

**2. "Permission denied" or RLS errors**

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'fortnights';

-- Verify teacher.auth_id matches current user
SELECT auth.uid(), t.auth_id
FROM teachers t
WHERE t.auth_id = auth.uid();

-- Should return 1 row with matching UUIDs
```

**3. Claude API generation fails**

- Check `ANTHROPIC_API_KEY` is set in `.env.local`
- Check API key has credits
- Check console for exact API error message
- Verify `/api/planner/generate` endpoint is accessible

## Architecture Notes

### Data Flow: Planeaciones

```
1. User navigates to /planeaciones
   ↓
2. loadFortnights() executes
   ↓
3. Check auth → Get user
   ↓
4. Query teachers table → Get teacher record
   ↓
5. Query fortnights table (filtered by teacher_id)
   ↓
6. Display results or zero state
```

**Key points:**

- RLS policies filter by `teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())`
- Code explicitly filters by `teacher_id` for clarity
- Each step logs errors to console
- Loading state always becomes false, even on error

### Database Dependencies

```
auth.users (Supabase Auth)
  ↓ auth_id
teachers
  ↓ id
fortnights (teacher_id) + groups (group_id)
  ↓ fortnight_id
lesson_plans
```

**Critical:** A user must have:

1. Auth account (created via register)
2. Teacher record (auth_id → teachers.auth_id)
3. Access to a group (for creating fortnights)

## Next Steps After Testing

If all tests pass:

- [ ] Push to Vercel
- [ ] Test on production domain
- [ ] Verify subdomain routing (diario.maestraai.mx)
- [ ] Test Chrome Extension (Richmond Sync)

If issues persist:

1. Share **exact console error messages**
2. Share **network tab** showing failing requests
3. Share **Supabase SQL query results** for teacher/fortnight checks
4. Include **browser and OS** details
