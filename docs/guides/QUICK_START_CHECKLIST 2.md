# Quick Start Checklist - Phase 2.5 Validation

**Execute these steps NOW to test the multi-tenant overhaul**

---

## ⚡ Immediate Actions (Next 30 minutes)

### 1. Run Migration 007 (5 minutes)

**Open:** Supabase Dashboard → SQL Editor

**Action:** Copy/paste and run `supabase/migrations/007_multi_tenant_setup.sql`

**Verify:**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'api_keys';
-- Should return: api_keys
```

✅ **Done when:** Query returns "api_keys"

---

### 2. Clean .env.local (1 minute)

**File:** `.env.local`

**Remove this line:**

```env
RICHMOND_INGEST_TOKEN=maestraai-dev-token-12345
```

**Keep:**

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
```

✅ **Done when:** File has no RICHMOND_INGEST_TOKEN

---

### 3. Restart Dev Server (1 minute)

```bash
# Kill existing
pkill -f "next dev"

# Start fresh
npm run dev
```

**Verify:** Opens http://localhost:3000

✅ **Done when:** Server running on port 3000

---

### 4. Clean Database (Optional - 2 minutes)

**Only if you want a fresh start:**

```sql
TRUNCATE teachers, schools, groups, students, api_keys,
         fortnights, lesson_plans, richmond_assignments CASCADE;
```

⚠️ **Warning:** Deletes ALL data

✅ **Done when:** All tables empty

---

### 5. Test New Onboarding (5 minutes)

**URL:** http://localhost:3000

**Steps:**

1. Click "Regístrate"
2. Email: `test@maestraai.mx` / Password: `test123`
3. Complete 7 steps:
   - Name: `María García`
   - Grade: `Kinder 3`
   - Editorial: `Richmond`
   - School: Create new "Colegio Americano"
   - Group: `Kinder 3A` / Grade: `Kinder 3` / Slug: `grupo-test`
   - Click "Generar mi clave API"
   - **COPY THE API KEY** (you'll need it!)
   - Click "Continuar" → "Ir al Dashboard"

**Verify dashboard loads**

✅ **Done when:** Dashboard shows "¡Hola, María!"

---

### 6. Verify Database (2 minutes)

```sql
-- Check everything linked
SELECT
  t.full_name,
  t.grade,
  t.editorial,
  t.school_id IS NOT NULL as has_school,
  COUNT(g.id) as groups_count,
  COUNT(ak.id) as api_keys_count
FROM teachers t
LEFT JOIN groups g ON g.titular_teacher_id = t.id
LEFT JOIN api_keys ak ON ak.teacher_id = t.id
WHERE t.email = 'test@maestraai.mx'
GROUP BY t.id, t.full_name, t.grade, t.editorial, t.school_id;
```

**Expected:**

```
full_name: María García
grade: Kinder 3
editorial: Richmond
has_school: true
groups_count: 1
api_keys_count: 1
```

✅ **Done when:** Query shows data above

---

### 7. Test Group Management (3 minutes)

**URL:** http://localhost:3000/configuracion

**Actions:**

1. Scroll to "Mis Grupos"
2. Click "Crear grupo"
3. Create: `Kinder 3B` / Grade: `Kinder 3`
4. Verify 2 groups listed

✅ **Done when:** Both groups visible in list

---

### 8. Test Dynamic Group Selection (3 minutes)

**URL:** http://localhost:3000/planeaciones/nueva

**Verify:**

- Dropdown shows "Grupo" with 2 options
- Select "Kinder 3A"
- Fill minimal data:
  - Quincena: `1`
  - Valor: `Respeto`
  - Dates: any 2-week period
  - Proyecto: `Test`
  - Letters: `A`, `B`
- Submit

**Verify in database:**

```sql
SELECT g.name
FROM fortnights f
JOIN groups g ON f.group_id = g.id
ORDER BY f.created_at DESC LIMIT 1;
-- Should return: Kinder 3A (not hardcoded UUID)
```

✅ **Done when:** Correct group assigned

---

### 9. Configure Chrome Extension (5 minutes)

**Install:**

1. Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. "Load unpacked" → select `/extension` folder

**Configure:**

1. Click extension icon
2. URL: `http://localhost:3000`
3. Paste API key from Step 5
4. Click "Guardar Configuración"
5. Click "Probar Conexión"

**Expected:**

- Green dot
- "Conectado como María García"
- "Grupos sincronizando: 2"

✅ **Done when:** Connection shows green

---

### 10. Test API Endpoint (2 minutes)

```bash
# Replace <YOUR_API_KEY> with the key from Step 5
curl http://localhost:3000/api/richmond/groups \
  -H "Authorization: Bearer <YOUR_API_KEY>"
```

**Expected response:**

```json
{
  "groupMap": {
    "grupo-test": "<uuid>"
  },
  "teacherName": "María García",
  "groups": ["Kinder 3A", "Kinder 3B"],
  "totalGroups": 2
}
```

✅ **Done when:** Returns group data

---

## 🎯 Critical Validation (Must All Pass)

- [ ] Migration 007 ran without errors
- [ ] Old RICHMOND_INGEST_TOKEN removed from .env
- [ ] Can complete 7-step onboarding without SQL
- [ ] Teacher has school_id (not NULL)
- [ ] Groups linked to teacher
- [ ] API key generated and saved
- [ ] API key is bcrypt hashed (60 chars, starts with $2)
- [ ] Planeaciones shows dynamic group dropdown
- [ ] Created fortnight uses selected group (not hardcoded)
- [ ] Chrome extension connects successfully
- [ ] /api/richmond/groups returns teacher's groups

---

## ⚠️ If Any Test Fails

**Stop and check:**

1. **Migration error?**
   - Re-run migration 007
   - Check Supabase logs

2. **Onboarding fails?**
   - Open browser console (F12)
   - Copy error message
   - Check which step failed

3. **Group not appearing?**
   - Run: `SELECT * FROM groups WHERE titular_teacher_id = (SELECT id FROM teachers WHERE email = 'test@maestraai.mx');`
   - Verify titular_teacher_id is set

4. **Extension won't connect?**
   - Verify dev server running
   - Check API key not revoked
   - Open extension popup console (F12 on popup)

5. **API returns 401?**
   - Verify API key copied correctly
   - Check not using old RICHMOND_INGEST_TOKEN

---

## 📊 Quick Status Check

Run this ONE query to see everything:

```sql
SELECT
  'Teachers' as metric,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE school_id IS NOT NULL) as with_school,
  COUNT(*) FILTER (WHERE grade IS NOT NULL) as with_grade
FROM teachers
WHERE email LIKE 'test%'

UNION ALL

SELECT
  'Groups',
  COUNT(*),
  COUNT(*) FILTER (WHERE titular_teacher_id IS NOT NULL),
  COUNT(*) FILTER (WHERE richmond_group_slug IS NOT NULL)
FROM groups

UNION ALL

SELECT
  'API Keys',
  COUNT(*),
  COUNT(*) FILTER (WHERE revoked_at IS NULL),
  COUNT(*) FILTER (WHERE LENGTH(key_hash) = 60)
FROM api_keys

UNION ALL

SELECT
  'Fortnights',
  COUNT(*),
  COUNT(DISTINCT group_id),
  COUNT(*) FILTER (WHERE status = 'draft')
FROM fortnights;
```

**Expected (after tests 1-10):**

```
metric      | count | with_school | with_grade
Teachers    | 1     | 1           | 1
Groups      | 2     | 2           | 1
API Keys    | 1     | 1           | 1
Fortnights  | 1     | 1           | 1
```

---

## ✅ Success = All Green

When all 10 steps complete successfully:

**🎉 Phase 2.5 is FULLY FUNCTIONAL**

You can now:

- Create users without SQL
- Manage schools/groups in UI
- Generate secure API keys
- Use Chrome extension with per-user auth
- Create planeaciones for any group
- Everything is multi-tenant and secure

**Next:** See `TESTING_GUIDE_PHASE_2.5.md` for comprehensive testing (edge cases, security, load testing)

---

## 🚀 Deployment Checklist

Before pushing to production:

- [ ] Run all tests in TESTING_GUIDE_PHASE_2.5.md
- [ ] Test with 2+ users (cross-tenant isolation)
- [ ] Verify extension works on real Richmond LP
- [ ] Update production .env with real Supabase URLs
- [ ] Run migration 007 on production database
- [ ] Test production extension (change URL to https://maestraai.mx)
- [ ] Document any issues found

**Estimated time to production-ready:** 2-4 hours of testing
