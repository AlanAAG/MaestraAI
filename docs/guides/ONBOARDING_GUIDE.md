# MaestraAI - Complete Onboarding & Testing Guide

**Use this guide to test the complete user flow from registration to Richmond sync.**

---

## Prerequisites

- ✅ All migrations run (001-006)
- ✅ `.env.local` configured with Supabase + Anthropic keys
- ✅ `npm run dev` running on http://localhost:3000
- ✅ Browser DevTools Console open (F12)

---

## 🚀 Part 1: Registration & Onboarding (UI)

### Step 1: Register New Account

1. Navigate to http://localhost:3000
2. Should auto-redirect to `/dashboard` then `/login` (not logged in)
3. Click "**Regístrate**"
4. Enter:
   - Email: `test@maestraai.mx` (or your email)
   - Password: `password123` (min 6 chars)
5. Click "**Crear cuenta**"

**Expected:**

- ✅ Redirects to `/onboarding`
- ✅ No errors in console

**If error: "Email confirmation required"**

- Go to Supabase Dashboard → Authentication → Settings
- Disable "Enable email confirmations"
- Try registering again with different email

---

### Step 2: Complete Onboarding

**Page:** `/onboarding` (3-step wizard)

**Step 1/3: ¿Cómo te llamas?**

- Enter: `María García` (or your name)
- Click "**Siguiente**"

**Step 2/3: ¿Qué grado enseñas?**

- Enter: `Kinder 3`
- Click "**Siguiente**"

**Step 3/3: ¿Qué editorial usas?**

- Enter: `Richmond`
- Click "**Finalizar**"

**Expected:**

- ✅ Redirects to `/dashboard`
- ✅ See "¡Hola, María!" greeting
- ✅ Three cards: Planeaciones, Boletas, Richmond
- ✅ Console shows no errors

**What Just Happened:**

```sql
-- Created in database:
auth.users {
  id: '<AUTH_UUID>',
  email: 'test@maestraai.mx'
}

teachers {
  id: '<TEACHER_UUID>',
  auth_id: '<AUTH_UUID>',  -- ← Links to auth.users
  email: 'test@maestraai.mx',
  full_name: 'María García',
  school_id: NULL,          -- ⚠️ Not set (gap)
  role: 'titular'
}
```

---

## 🔗 Part 2: Link Teacher to School & Groups (SQL)

**⚠️ Currently cannot be done via UI - must use SQL**

### Step 1: Get Your Teacher ID

Open Supabase Dashboard → SQL Editor → New Query:

```sql
-- Find your teacher record
SELECT id, auth_id, email, full_name, school_id
FROM teachers
WHERE email = 'test@maestraai.mx';
```

**Copy the `id` value** - this is your `<TEACHER_ID>`

Example output:

```
id: 10b2c3d4-5678-90ab-cdef-1234567890ab
auth_id: a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6
email: test@maestraai.mx
full_name: María García
school_id: NULL
```

---

### Step 2: Link to School

**Check if school exists:**

```sql
SELECT * FROM schools;
```

**If no schools exist, create one:**

```sql
INSERT INTO schools (id, name, city, state)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Escuela Americana',
  'Ciudad de México',
  'CDMX'
);
```

**Link your teacher to school:**

```sql
-- Replace <TEACHER_ID> with your ID from Step 1
UPDATE teachers
SET school_id = 'a1b2c3d4-0000-0000-0000-000000000001'
WHERE id = '<TEACHER_ID>';
```

**Verify:**

```sql
SELECT t.email, t.full_name, s.name as school_name
FROM teachers t
LEFT JOIN schools s ON t.school_id = s.id
WHERE t.email = 'test@maestraai.mx';
```

Should show: `school_name: Escuela Americana`

---

### Step 3: Link to Group(s)

**Check existing groups:**

```sql
SELECT id, name, grade, titular_teacher_id FROM groups;
```

**If you ran `seed_step2.sql`, you'll see:**

- Preprimaria A: `91000000-0000-0000-0000-000000000001`
- Preprimaria B: `92000000-0000-0000-0000-000000000002`

**Assign yourself to Preprimaria A:**

```sql
-- Replace <TEACHER_ID> with your ID
UPDATE groups
SET titular_teacher_id = '<TEACHER_ID>'
WHERE id = '91000000-0000-0000-0000-000000000001';
```

**Verify:**

```sql
SELECT
  g.name as group_name,
  g.grade,
  t.full_name as teacher_name,
  COUNT(s.id) as student_count
FROM groups g
LEFT JOIN teachers t ON g.titular_teacher_id = t.id
LEFT JOIN students s ON s.group_id = g.id
WHERE g.titular_teacher_id = '<TEACHER_ID>'
GROUP BY g.id, g.name, g.grade, t.full_name;
```

**Expected output:**

```
group_name: Preprimaria A
grade: Kinder 3
teacher_name: María García
student_count: 12
```

✅ **Now your teacher is fully linked!**

---

## 📝 Part 3: Create Your First Planeación

### Step 1: Navigate to Planeaciones

1. In the app, click "**Planeaciones**" in sidebar
2. Should see zero-state: "No hay planeaciones aún"
3. Click "**Nueva Planeación**"

**Console Check:**

- ✅ No errors
- ✅ Page loads without infinite spinner

---

### Step 2: Fill Out Form

**Form fields:**

- Quincena #: `1`
- Valor del mes: `Respeto`
- Fecha inicio: `2026-09-01` (any Monday)
- Fecha fin: `2026-09-12` (2 weeks later)
- Proyecto mensual: `Los animales de la granja`
- Letra semana 1: `A`
- Letra semana 2: `B`

Click "**Generar Planeación**"

**Expected:**

- ✅ Redirects to `/planeaciones/<id>`
- ✅ Shows fortnight header
- ✅ Shows "Planeación lista para generar" card

**Console Check:**

- ✅ No "Fortnight query error"
- ✅ No RLS errors

---

### Step 3: Generate AI Lesson Plans

1. Click "**Generar Planeación**" button
2. Should see loading phases:
   - Preparando...
   - Analizando...
   - Generando...

**⚠️ Requires `ANTHROPIC_API_KEY` in `.env.local`**

**Expected (success):**

- ✅ Phases progress smoothly
- ✅ After ~30 seconds, see 10 day cards
- ✅ Click any day to expand → see lesson blocks

**Expected (if no API key):**

- ❌ Stuck on "Preparando..." or error
- Check console for: `ANTHROPIC_API_KEY is not set`

---

## 🔌 Part 4: Richmond Sync Setup

### Step 1: Install Chrome Extension

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "**Developer mode**" (top right toggle)
4. Click "**Load unpacked**"
5. Select folder: `/Users/alan/Desktop/MaestraAI/extension`
6. Extension icon should appear in toolbar

**Verify:**

- ✅ Extension shows in list
- ✅ "MaestraAI Richmond Sync" visible
- ✅ No load errors

---

### Step 2: Configure Extension

**⚠️ First, get the token from your `.env.local`:**

Open `.env.local` and find:

```env
RICHMOND_INGEST_TOKEN=your-secret-token-here
```

**If missing, add one:**

```env
RICHMOND_INGEST_TOKEN=maestraai-dev-token-12345
```

**Now configure extension:**

1. Click extension icon in Chrome toolbar
2. Enter:
   - **Sync Token:** `maestraai-dev-token-12345` (from .env)
   - **MaestraAI URL:** `http://localhost:3000`
3. Click "**Guardar Configuración**"

**Verify:**

- ✅ "Configuración guardada" message
- ✅ Token and URL saved

---

### Step 3: Test Richmond Sync

**⚠️ Requires:**

- Active Richmond LP account
- Access to Markbook for a group

**Process:**

1. Log into https://richmondlp.com
2. Navigate to your class Markbook page
3. URL should look like: `/courses/grupo-aca6e/markbook`

**What happens:**

- Extension detects page
- Intercepts XHR calls to `/api/.../assignment_scores.json`
- Maps `grupo-aca6e` → `91000000-0000-0000-0000-000000000001`
- Sends data to `http://localhost:3000/api/richmond/ingest`
- Chrome notification: "Sincronización exitosa"

**Check in app:**

1. Go to `/dashboard` in MaestraAI
2. Richmond card should show: "Última sincronización: Hace unos minutos"
3. Click Richmond card
4. Should see:
   - Last sync time
   - Assignment list
   - Student scores

**Console Check:**

```javascript
// In Chrome DevTools on richmondlp.com:
// Should see logs like:
'[MaestraAI] Intercepted assignment scores for grupo-aca6e'
'[MaestraAI] Mapped to group: 91000000-0000-0000-0000-000000000001'
'[MaestraAI] Syncing 15 assignments...'
'[MaestraAI] Sync successful!'
```

---

## ✅ Verification Checklist

### Auth & Profile

- [ ] Can register new account
- [ ] Can complete onboarding wizard
- [ ] Dashboard shows teacher name
- [ ] Can update name in configuración
- [ ] Can log out and log back in

### Database Links

- [ ] Teacher has auth_id matching auth.users.id
- [ ] Teacher linked to school (via SQL)
- [ ] Teacher linked to group(s) (via SQL)
- [ ] Groups contain students (12 per group if seeded)

### Planeaciones

- [ ] Can view planeaciones list (zero-state if none)
- [ ] Can create nueva planeación
- [ ] Form validation works
- [ ] Redirects to detail page
- [ ] Can generate AI lesson plans (if API key set)
- [ ] Can view generated plans

### Richmond Sync

- [ ] Extension installed without errors
- [ ] Extension configured with token
- [ ] Extension intercepts Richmond API calls
- [ ] Data appears in `/dashboard/richmond`
- [ ] Assignments and scores visible
- [ ] Sync log shows success status

---

## 🐛 Common Issues & Solutions

### Issue: "No teacher found" on dashboard

**Check:**

```sql
SELECT * FROM teachers WHERE email = 'test@maestraai.mx';
```

**Solutions:**

- If no results: Complete onboarding wizard
- If auth_id is NULL: Onboarding didn't complete properly, re-run:
  ```sql
  UPDATE teachers
  SET auth_id = (SELECT id FROM auth.users WHERE email = 'test@maestraai.mx')
  WHERE email = 'test@maestraai.mx';
  ```

---

### Issue: Planeaciones page stuck loading

**Open Console - Check for:**

- `Teacher query error:` → No teacher record
- `Fortnights query error:` → Table doesn't exist (run migrations)

**Verify teacher exists:**

```sql
SELECT * FROM teachers WHERE auth_id = auth.uid();
```

**If RLS error:**

```sql
-- Check if auth_id matches
SELECT
  t.auth_id as teacher_auth_id,
  auth.uid() as current_user_id,
  t.auth_id = auth.uid() as ids_match
FROM teachers t
WHERE t.email = 'test@maestraai.mx';
```

`ids_match` must be TRUE.

---

### Issue: Extension not syncing

**Check:**

1. Extension enabled in `chrome://extensions/`
2. Token configured correctly
3. Token in `.env.local` matches extension config
4. `npm run dev` is running
5. Console on Richmond page shows intercept logs

**Verify API endpoint:**

```bash
# Test the ingest endpoint
curl -X POST http://localhost:3000/api/richmond/ingest \
  -H "Authorization: Bearer maestraai-dev-token-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "91000000-0000-0000-0000-000000000001",
    "data": []
  }'

# Should return: {"ok": true, ...}
```

---

### Issue: "Group not found" when creating planeación

**Reason:** Hardcoded group_id doesn't exist or teacher not linked

**Fix:**

```sql
-- Create the expected group
INSERT INTO groups (
  id,
  school_id,
  titular_teacher_id,
  name,
  grade,
  academic_year
)
VALUES (
  '91000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  '<YOUR_TEACHER_ID>',
  'Preprimaria A',
  'Kinder 3',
  '2025-2026'
)
ON CONFLICT (id) DO UPDATE
SET titular_teacher_id = '<YOUR_TEACHER_ID>';
```

---

## 📊 Database State Verification

Run this comprehensive check:

```sql
-- Complete User Setup Verification
WITH user_data AS (
  SELECT id, email FROM auth.users WHERE email = 'test@maestraai.mx'
),
teacher_data AS (
  SELECT * FROM teachers WHERE email = 'test@maestraai.mx'
),
group_data AS (
  SELECT * FROM groups WHERE titular_teacher_id = (SELECT id FROM teacher_data)
)
SELECT
  -- Auth
  (SELECT email FROM user_data) as auth_email,
  (SELECT id FROM user_data) as auth_id,

  -- Teacher
  (SELECT id FROM teacher_data) as teacher_id,
  (SELECT auth_id FROM teacher_data) as teacher_auth_id,
  (SELECT school_id FROM teacher_data) as teacher_school_id,

  -- Match Check
  (SELECT auth_id FROM teacher_data) = (SELECT id FROM user_data) as auth_linked,

  -- Groups
  (SELECT COUNT(*) FROM group_data) as groups_count,
  (SELECT array_agg(name) FROM group_data) as group_names,

  -- Students
  (
    SELECT COUNT(*)
    FROM students s
    WHERE s.group_id IN (SELECT id FROM group_data)
  ) as total_students,

  -- Overall Status
  CASE
    WHEN (SELECT id FROM teacher_data) IS NULL THEN '❌ No teacher record'
    WHEN (SELECT auth_id FROM teacher_data) != (SELECT id FROM user_data) THEN '❌ auth_id mismatch'
    WHEN (SELECT school_id FROM teacher_data) IS NULL THEN '⚠️ No school linked'
    WHEN (SELECT COUNT(*) FROM group_data) = 0 THEN '⚠️ No groups linked'
    ELSE '✅ Fully configured'
  END as status;
```

**Expected output for fully configured user:**

```
auth_email: test@maestraai.mx
auth_id: a1b2c3d4-...
teacher_id: 10b2c3d4-...
teacher_auth_id: a1b2c3d4-... (same as auth_id)
teacher_school_id: a1b2c3d4-... (not NULL)
auth_linked: TRUE
groups_count: 1 or more
group_names: {Preprimaria A}
total_students: 12 or more
status: ✅ Fully configured
```

---

## 🎯 Next Steps

After completing this guide:

1. ✅ Push to Vercel (if all tests pass)
2. ⚠️ Update production .env with real tokens
3. ⚠️ Enable email confirmation in Supabase
4. 🔧 Plan P0 fixes (see `docs/USER_FLOW.md` → Recommended Fixes)

**Critical improvements needed:**

- Dynamic group selection (remove hardcoded ID)
- School/group management UI
- Per-user extension API keys
