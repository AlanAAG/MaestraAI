# MaestraAI Phase 2.5 Testing Guide

**Complete validation checklist for multi-tenant overhaul**

---

## Prerequisites Checklist

Before testing, ensure:

- [ ] All migrations 001-007 run successfully in Supabase
- [ ] `.env.local` has all required keys (see below)
- [ ] Chrome browser installed (for extension testing)
- [ ] Access to a Richmond LP account (optional, for full sync testing)
- [ ] Development server can run: `npm run dev`

---

## Step 1: Database Setup & Migration

### 1.1 Run Migration 007

**Location:** Supabase Dashboard → SQL Editor → New Query

Copy and paste the entire contents of `supabase/migrations/007_multi_tenant_setup.sql` and run it.

**Expected output:**

```
CREATE TABLE
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
ALTER TABLE
CREATE INDEX
ALTER TABLE
CREATE INDEX
ALTER TABLE
ALTER TABLE
```

**Verify migration success:**

```sql
-- Check api_keys table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'api_keys';

-- Should return: id, teacher_id, name, key_prefix, key_hash, created_at, last_used_at, revoked_at

-- Check new columns on teachers
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'teachers'
AND column_name IN ('grade', 'editorial');

-- Should return: grade, editorial

-- Check RLS policies on api_keys
SELECT policyname
FROM pg_policies
WHERE tablename = 'api_keys';

-- Should return 3 policies: view own, create own, revoke own
```

### 1.2 Clean Database (Start Fresh)

**Important:** This will delete ALL existing data. Only run if you want a clean slate.

```sql
-- Delete all data (preserves tables and migrations)
TRUNCATE teachers, schools, groups, students, api_keys,
         fortnights, lesson_plans, richmond_assignments,
         richmond_scores, richmond_sync_log, teacher_diary CASCADE;

-- Verify empty tables
SELECT
  (SELECT COUNT(*) FROM teachers) as teachers_count,
  (SELECT COUNT(*) FROM schools) as schools_count,
  (SELECT COUNT(*) FROM groups) as groups_count,
  (SELECT COUNT(*) FROM api_keys) as api_keys_count;

-- All counts should be 0
```

---

## Step 2: Environment Configuration

### 2.1 Update `.env.local`

**Remove old token (no longer used):**

```env
# RICHMOND_INGEST_TOKEN=maestraai-dev-token-12345  ← DELETE THIS LINE
```

**Keep these:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

**Verify:**

```bash
# Check .env.local does NOT contain RICHMOND_INGEST_TOKEN
grep -i "RICHMOND_INGEST_TOKEN" .env.local

# Should return nothing (empty)
```

### 2.2 Restart Development Server

```bash
# Kill any running instances
pkill -f "next dev"

# Start fresh
npm run dev
```

**Expected output:**

```
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

**Open browser:** http://localhost:3000

---

## Step 3: Registration & Onboarding Flow

### 3.1 Register New Account

**URL:** http://localhost:3000

**Expected:** Auto-redirect to `/login` (auth guard working)

1. Click "**Regístrate**"
2. Enter:
   - Email: `test@maestraai.mx`
   - Password: `testpass123`
3. Click "**Crear cuenta**"

**Expected:** Redirects to `/onboarding` (Step 1 of 7)

**✅ Verification:**

- [ ] No errors in browser console (F12)
- [ ] Progress bar shows "Paso 1 de 7"

### 3.2 Step 1: Name

**Question:** ¿Cómo te llamas?

**Enter:** `María García`

**Click:** "Siguiente"

**Expected:** Moves to Step 2

**✅ Verification:**

- [ ] Progress bar updates to "Paso 2 de 7"
- [ ] No console errors

### 3.3 Step 2: Grade

**Question:** ¿Qué grado enseñas?

**Enter:** `Kinder 3`

**Click:** "Siguiente"

**Expected:** Moves to Step 3

**✅ Verification:**

- [ ] Progress bar updates to "Paso 3 de 7"

### 3.4 Step 3: Editorial

**Question:** ¿Qué editorial usas?

**Enter:** `Richmond`

**Click:** "Siguiente"

**Expected:** Moves to Step 4 (School selection)

**✅ Verification:**

- [ ] Progress bar updates to "Paso 4 de 7"
- [ ] Dropdown shows "Selecciona tu escuela"
- [ ] Option "➕ Crear nueva escuela" visible

### 3.5 Step 4: School Selection

**Action:** Click dropdown, select "➕ Crear nueva escuela"

**Expected:** Form appears with 3 fields

**Fill in:**

- Nombre de la escuela: `Colegio Americano de México`
- Ciudad: `Ciudad de México`
- Estado: Select "**Ciudad de México**"

**Click:** "Crear escuela"

**Expected:**

- Button shows "Creando..."
- Then form disappears
- School is selected in dropdown
- "Siguiente" button enabled

**Click:** "Siguiente"

**Expected:** Moves to Step 5 (Group creation)

**✅ Verification:**

- [ ] Console shows no errors
- [ ] Step 5 shows "Crea tu primer grupo"

### 3.6 Step 5: Group Creation

**Fill in:**

- Nombre del grupo: `Kinder 3A`
- Grado: Select "**Kinder 3**"
- Año escolar: `2025-2026` (pre-filled)
- Richmond Group Slug: `grupo-test` (optional)

**Click:** "Crear grupo"

**Expected:**

- Button shows "Creando grupo..."
- Moves to Step 6 (API key)

**✅ Verification:**

- [ ] Step 6 shows "Tu clave API"
- [ ] Button says "Generar mi clave API"

### 3.7 Step 6: API Key Generation

**Click:** "Generar mi clave API"

**Expected:**

- Button shows "Generando clave..."
- After ~1 second, API key displays
- Key starts with `mk_` followed by 50 characters
- Warning message appears: "⚠️ Guarda esta clave ahora"
- "Copiar" button visible

**Action:** Click "**Copiar**" button

**Expected:** Button changes to "✓ Copiado"

**Save the key somewhere** (you'll need it for extension setup)

**Click:** "Continuar"

**Expected:** Moves to Step 7 (Confirmation)

**✅ Verification:**

- [ ] API key copied to clipboard
- [ ] Console shows no errors

### 3.8 Step 7: Confirmation

**Expected:**

- Green checkmark icon
- Message: "¡Perfecto! Tu cuenta está configurada..."
- Button: "Ir al Dashboard"

**Click:** "Ir al Dashboard"

**Expected:** Redirects to `/dashboard`

**✅ Verification:**

- [ ] Dashboard loads without errors
- [ ] Greeting shows "¡Hola, María!"
- [ ] Three cards visible: Planeaciones, Boletas, Richmond

---

## Step 4: Database Validation (After Onboarding)

**Open Supabase SQL Editor and run these queries:**

### 4.1 Verify Teacher Record

```sql
SELECT
  id,
  auth_id,
  email,
  full_name,
  grade,
  editorial,
  school_id,
  role
FROM teachers
WHERE email = 'test@maestraai.mx';
```

**Expected output:**

```
id: <uuid>
auth_id: <uuid> (not null)
email: test@maestraai.mx
full_name: María García
grade: Kinder 3
editorial: Richmond
school_id: <uuid> (not null)
role: titular
```

**✅ Verification:**

- [ ] school_id is NOT NULL
- [ ] grade and editorial are saved
- [ ] auth_id matches Supabase Auth user

### 4.2 Verify School Record

```sql
SELECT
  id,
  name,
  city,
  state
FROM schools
WHERE name = 'Colegio Americano de México';
```

**Expected output:**

```
id: <uuid>
name: Colegio Americano de México
city: Ciudad de México
state: Ciudad de México
```

**✅ Verification:**

- [ ] School exists
- [ ] All fields populated

### 4.3 Verify Group Record

```sql
SELECT
  g.id,
  g.name,
  g.grade,
  g.academic_year,
  g.richmond_group_slug,
  g.titular_teacher_id,
  g.school_id,
  t.full_name as teacher_name
FROM groups g
JOIN teachers t ON g.titular_teacher_id = t.id
WHERE t.email = 'test@maestraai.mx';
```

**Expected output:**

```
id: <uuid>
name: Kinder 3A
grade: Kinder 3
academic_year: 2025-2026
richmond_group_slug: grupo-test
titular_teacher_id: <teacher_uuid>
school_id: <school_uuid>
teacher_name: María García
```

**✅ Verification:**

- [ ] Group exists
- [ ] titular_teacher_id matches teacher
- [ ] school_id matches school
- [ ] richmond_group_slug saved

### 4.4 Verify API Key Record

```sql
SELECT
  id,
  name,
  key_prefix,
  created_at,
  last_used_at,
  revoked_at,
  teacher_id
FROM api_keys
WHERE teacher_id = (SELECT id FROM teachers WHERE email = 'test@maestraai.mx');
```

**Expected output:**

```
id: <uuid>
name: Extensión de Chrome - Configuración inicial
key_prefix: mk_xxxxxxx (first 11 chars)
created_at: <timestamp>
last_used_at: NULL
revoked_at: NULL
teacher_id: <teacher_uuid>
```

**✅ Verification:**

- [ ] API key exists
- [ ] key*prefix starts with `mk*`
- [ ] revoked_at is NULL (active)
- [ ] key_hash exists (not plaintext)

### 4.5 Check Key Hash Security

```sql
SELECT
  key_prefix,
  LENGTH(key_hash) as hash_length,
  key_hash LIKE '$2%' as is_bcrypt
FROM api_keys
WHERE teacher_id = (SELECT id FROM teachers WHERE email = 'test@maestraai.mx');
```

**Expected output:**

```
key_prefix: mk_xxxxxxx
hash_length: 60
is_bcrypt: true
```

**✅ Verification:**

- [ ] hash_length is 60 (bcrypt standard)
- [ ] is_bcrypt is TRUE (starts with $2)

---

## Step 5: Settings Page Testing

### 5.1 Access Settings

**URL:** http://localhost:3000/configuracion

**Expected:** Page loads with 4 sections

**✅ Verification:**

- [ ] Profile section shows name
- [ ] School section shows "Colegio Americano de México"
- [ ] Mis Grupos section shows "Kinder 3A"
- [ ] Integración Richmond section visible

### 5.2 Test Profile Edit

**Action:**

1. Change name to `María García López`
2. Click "Guardar cambios"

**Expected:**

- Button shows "Guardando..."
- Success message: "✓ Cambios guardados"

**Verify in database:**

```sql
SELECT full_name FROM teachers WHERE email = 'test@maestraai.mx';
-- Should return: María García López
```

**✅ Verification:**

- [ ] Name updated successfully
- [ ] No console errors

### 5.3 Test Group List

**Expected in Mis Grupos:**

- Card showing "Kinder 3A"
- Details: "Kinder 3 • 2025-2026 • 0 estudiantes"
- Richmond slug badge: "Richmond: grupo-test"
- Three buttons: "Ver estudiantes", Edit, Delete

**✅ Verification:**

- [ ] Group card displays correctly
- [ ] All details visible

### 5.4 Test View Students

**Click:** "Ver estudiantes" button on Kinder 3A

**Expected:**

- Title changes to "Estudiantes"
- Message: "No hay estudiantes en este grupo"
- Subtitle: "Los estudiantes se sincronizarán desde Richmond LP"

**Click:** X button (top right)

**Expected:** Returns to group list

**✅ Verification:**

- [ ] Student roster view works
- [ ] Can return to list

### 5.5 Test Create Group

**Click:** "Crear grupo" button

**Expected:** Form appears with fields

**Fill in:**

- Nombre del grupo: `Kinder 3B`
- Grado: `Kinder 3`
- Año escolar: `2025-2026`
- Richmond Group Slug: `grupo-test-b`

**Click:** "Crear grupo"

**Expected:**

- Returns to list
- Now shows 2 groups: Kinder 3A and Kinder 3B

**✅ Verification:**

- [ ] Second group created
- [ ] Both groups visible in list

### 5.6 Test Edit Group

**Click:** Edit button (pencil icon) on Kinder 3A

**Expected:** Form pre-filled with current data

**Change:**

- Nombre del grupo: `Kinder 3 - Grupo A`

**Click:** "Guardar cambios"

**Expected:**

- Returns to list
- Group name updated to "Kinder 3 - Grupo A"

**✅ Verification:**

- [ ] Group edited successfully
- [ ] Name changed in list

### 5.7 Test API Key Manager

**Scroll to:** Integración Richmond section

**Expected:**

- One active key listed
- Shows: "Extensión de Chrome - Configuración inicial"
- Key prefix: `mk_xxxxxxx...`
- Created date visible
- Trash button visible

**Click:** "Generar nueva clave API"

**Expected:** Form appears

**Fill in:**

- Nombre de la clave: `Test Key - Chrome Extension`

**Click:** "Generar"

**Expected:**

- Success message with full key displayed
- Warning: "⚠️ Guarda esta clave ahora"
- Copy button available

**Click:** "Copiar"

**Expected:** Button changes to "✓ Copiado"

**Scroll down to see key list:**

**Expected:**

- Now shows 2 active keys
- New key at top: "Test Key - Chrome Extension"

**✅ Verification:**

- [ ] Second API key generated
- [ ] Both keys listed
- [ ] Key copied to clipboard

### 5.8 Test Revoke API Key

**Click:** Trash button on the second key ("Test Key - Chrome Extension")

**Expected:** Confirmation dialog appears

**Click:** OK/Confirm

**Expected:**

- Key moves to "Claves revocadas" section
- Shows strikethrough and revocation date

**✅ Verification:**

- [ ] Key revoked successfully
- [ ] Moved to revoked section
- [ ] Revocation date shown

---

## Step 6: Planeaciones - Dynamic Group Selection

### 6.1 Access Planeaciones

**URL:** http://localhost:3000/planeaciones

**Expected:**

- Zero-state message: "No hay planeaciones aún"
- Button: "Nueva Planeación"

**Click:** "Nueva Planeación"

**Expected:** Redirects to `/planeaciones/nueva`

**✅ Verification:**

- [ ] Page loads without errors
- [ ] Form visible

### 6.2 Verify Group Selector

**Expected at top of form:**

- Label: "Grupo"
- Dropdown with options:
  - "Selecciona el grupo"
  - "Kinder 3 - Grupo A (Kinder 3)"
  - "Kinder 3B (Kinder 3)"

**✅ Verification:**

- [ ] Dropdown shows both groups
- [ ] No hardcoded group
- [ ] Groups loaded dynamically

### 6.3 Create Planeación with Group Selection

**Select:** "Kinder 3 - Grupo A (Kinder 3)"

**Fill in:**

- Quincena #: `1`
- Valor del mes: `Respeto`
- Fecha inicio: `2026-09-01`
- Fecha fin: `2026-09-12`
- Proyecto mensual: `Los animales de la granja`
- Letra semana 1: `A`
- Letra semana 2: `B`

**Click:** "Generar Planeación"

**Expected:**

- Redirects to `/planeaciones/<id>`
- Shows fortnight header with dates

**✅ Verification:**

- [ ] Planeación created successfully
- [ ] Detail page loads

### 6.4 Verify Correct Group Assignment

**Run in Supabase:**

```sql
SELECT
  f.id,
  f.project_name,
  g.name as group_name,
  t.full_name as teacher_name
FROM fortnights f
JOIN groups g ON f.group_id = g.id
JOIN teachers t ON f.teacher_id = t.id
WHERE t.email = 'test@maestraai.mx'
ORDER BY f.created_at DESC
LIMIT 1;
```

**Expected output:**

```
id: <uuid>
project_name: Los animales de la granja
group_name: Kinder 3 - Grupo A
teacher_name: María García López
```

**✅ Verification:**

- [ ] group_name is "Kinder 3 - Grupo A" (selected group)
- [ ] NOT a hardcoded UUID
- [ ] Correct teacher assigned

### 6.5 Create Second Planeación for Different Group

**Go back to:** `/planeaciones/nueva`

**Select:** "Kinder 3B (Kinder 3)"

**Fill in:**

- Quincena #: `1`
- Valor del mes: `Amistad`
- Fecha inicio: `2026-09-01`
- Fecha fin: `2026-09-12`
- Proyecto mensual: `Mis amigos`
- Letra semana 1: `C`
- Letra semana 2: `D`

**Click:** "Generar Planeación"

**Verify in database:**

```sql
SELECT
  f.project_name,
  g.name as group_name
FROM fortnights f
JOIN groups g ON f.group_id = g.id
JOIN teachers t ON f.teacher_id = t.id
WHERE t.email = 'test@maestraai.mx'
ORDER BY f.created_at;
```

**Expected output:**

```
Row 1: Los animales de la granja | Kinder 3 - Grupo A
Row 2: Mis amigos | Kinder 3B
```

**✅ Verification:**

- [ ] Two planeaciones created
- [ ] Each assigned to different group
- [ ] Groups are dynamically selected

---

## Step 7: Chrome Extension Testing

### 7.1 Install Extension

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "**Developer mode**" (top right toggle)
4. Click "**Load unpacked**"
5. Select folder: `/Users/alan/Desktop/MaestraAI/extension`

**Expected:**

- Extension appears in list
- Name: "MaestraAI Richmond Sync"
- Version: visible
- No errors

**✅ Verification:**

- [ ] Extension installed
- [ ] No load errors
- [ ] Icon visible in toolbar

### 7.2 Configure Extension

**Click:** Extension icon in toolbar (puzzle piece → MaestraAI)

**Expected popup:**

- Title: "MaestraAI Sync"
- URL field: pre-filled or empty
- Clave API field: empty
- Status: "No configurado"

**Fill in:**

- URL de MaestraAI: `http://localhost:3000`
- Clave API: (paste the API key you saved from onboarding)

**Click:** "Guardar Configuración"

**Expected:**

- Message: "✓ Configuración guardada"
- Status changes after 1 second

**✅ Verification:**

- [ ] Configuration saved
- [ ] No errors in popup console (F12 on popup)

### 7.3 Test Connection

**Click:** "Probar Conexión" button

**Expected:**

- Status changes to "Probando conexión..."
- After ~1 second:
  - Green dot appears
  - Title: "Conectado como María García López"
  - Shows: "Grupos sincronizando: 2"
  - Shows: "Grupos: Kinder 3 - Grupo A, Kinder 3B"

**✅ Verification:**

- [ ] Connection successful
- [ ] Teacher name correct
- [ ] Group count correct (2)
- [ ] Group names displayed

### 7.4 Test Invalid API Key

**Action:**

1. Change Clave API to: `mk_invalid_key_test`
2. Click "Guardar Configuración"
3. Click "Probar Conexión"

**Expected:**

- Red dot appears
- Title: "Error de conexión"
- Message: "Clave API inválida o revocada"

**Restore valid key:**

1. Paste original API key
2. Click "Guardar Configuración"
3. Verify green status returns

**✅ Verification:**

- [ ] Invalid key detected
- [ ] Error message shown
- [ ] Valid key restores connection

### 7.5 Verify Dynamic Group Loading

**Open browser console on any page:**

**Navigate to:** https://richmondlp.com (if you have access)

**Look for console messages:**

```
[MaestraAI] Content script loaded - waiting for group mappings...
[MaestraAI] Loaded group mappings: {grupo-test: "<uuid>", grupo-test-b: "<uuid>"}
[MaestraAI] Connected as: María García López
[MaestraAI] Syncing 2 groups
```

**✅ Verification:**

- [ ] Content script loads
- [ ] Group mappings fetched dynamically
- [ ] No hardcoded UUIDs in content.js

---

## Step 8: API Endpoint Testing

### 8.1 Test GET /api/keys

**Run in terminal or Postman:**

```bash
# Get session cookie from browser (DevTools → Application → Cookies)
# Copy the sb-<project>-auth-token cookie value

curl http://localhost:3000/api/keys \
  -H "Cookie: sb-<project>-auth-token=<cookie_value>"
```

**Expected response:**

```json
{
  "keys": [
    {
      "id": "<uuid>",
      "name": "Extensión de Chrome - Configuración inicial",
      "key_prefix": "mk_xxxxxxx",
      "created_at": "2026-05-25T...",
      "last_used_at": "2026-05-25T...",
      "revoked_at": null
    },
    {
      "id": "<uuid>",
      "name": "Test Key - Chrome Extension",
      "key_prefix": "mk_yyyyyyy",
      "created_at": "2026-05-25T...",
      "last_used_at": null,
      "revoked_at": "2026-05-25T..."
    }
  ]
}
```

**✅ Verification:**

- [ ] Returns list of keys
- [ ] Does NOT include key_hash (security)
- [ ] Shows revoked_at for revoked keys

### 8.2 Test GET /api/richmond/groups

```bash
# Use the API key you generated
curl http://localhost:3000/api/richmond/groups \
  -H "Authorization: Bearer mk_<your_api_key>"
```

**Expected response:**

```json
{
  "groupMap": {
    "grupo-test": "<uuid_of_kinder_3a>",
    "grupo-test-b": "<uuid_of_kinder_3b>"
  },
  "teacherName": "María García López",
  "groups": ["Kinder 3 - Grupo A", "Kinder 3B"],
  "totalGroups": 2
}
```

**✅ Verification:**

- [ ] Returns group mappings
- [ ] Teacher name correct
- [ ] Group count matches database

### 8.3 Test POST /api/richmond/ingest (Security)

**Test with invalid API key:**

```bash
curl -X POST http://localhost:3000/api/richmond/ingest \
  -H "Authorization: Bearer invalid_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "91000000-0000-0000-0000-000000000001",
    "data": []
  }'
```

**Expected response:**

```json
{
  "error": "Invalid API key"
}
```

**HTTP status:** 401 Unauthorized

**Test with valid key but wrong group:**

```bash
# Create a second user to get a different teacher's API key
# For now, test with valid key and valid group

curl -X POST http://localhost:3000/api/richmond/ingest \
  -H "Authorization: Bearer mk_<your_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "<your_group_uuid>",
    "data": []
  }'
```

**Expected response:**

```json
{
  "ok": true,
  "synced": 0,
  "errors": []
}
```

**✅ Verification:**

- [ ] Invalid key rejected (401)
- [ ] Valid key accepted
- [ ] Empty data array handled correctly

---

## Step 9: Cross-Tenant Isolation Testing

### 9.1 Create Second User

**Open incognito window:** http://localhost:3000

**Register second account:**

- Email: `test2@maestraai.mx`
- Password: `testpass123`

**Complete onboarding:**

- Name: `Ana Martínez`
- Grade: `Kinder 2`
- Editorial: `Macmillan`
- School: Create new "Escuela Benito Juárez"
- Group: "Kinder 2A"
- Generate API key (save it)

**✅ Verification:**

- [ ] Second user created successfully
- [ ] Separate school created
- [ ] Separate group created

### 9.2 Verify Data Isolation

**As User 1 (María):**

```sql
SELECT
  t.full_name as teacher,
  g.name as group_name,
  COUNT(ak.id) as api_keys_count
FROM teachers t
LEFT JOIN groups g ON g.titular_teacher_id = t.id
LEFT JOIN api_keys ak ON ak.teacher_id = t.id
WHERE t.email = 'test@maestraai.mx'
GROUP BY t.full_name, g.name;
```

**Expected:**

```
teacher: María García López
group_name: Kinder 3 - Grupo A
api_keys_count: 2

teacher: María García López
group_name: Kinder 3B
api_keys_count: 2
```

**As User 2 (Ana):**

```sql
SELECT
  t.full_name as teacher,
  g.name as group_name,
  COUNT(ak.id) as api_keys_count
FROM teachers t
LEFT JOIN groups g ON g.titular_teacher_id = t.id
LEFT JOIN api_keys ak ON ak.teacher_id = t.id
WHERE t.email = 'test2@maestraai.mx'
GROUP BY t.full_name, g.name;
```

**Expected:**

```
teacher: Ana Martínez
group_name: Kinder 2A
api_keys_count: 1
```

**✅ Verification:**

- [ ] Each teacher sees only their own groups
- [ ] Each teacher has separate API keys
- [ ] No data bleeding between users

### 9.3 Test Cross-Tenant API Key Rejection

**Attempt to use User 1's API key to access User 2's group:**

```bash
# Use María's API key
# Use Ana's group UUID

curl http://localhost:3000/api/richmond/groups \
  -H "Authorization: Bearer <maria_api_key>"
```

**Expected response (should only show María's groups):**

```json
{
  "groupMap": {
    "grupo-test": "<uuid>",
    "grupo-test-b": "<uuid>"
  },
  "teacherName": "María García López",
  "groups": ["Kinder 3 - Grupo A", "Kinder 3B"],
  "totalGroups": 2
}
```

**✅ Verification:**

- [ ] API key only returns own teacher's data
- [ ] Cannot access other teacher's groups
- [ ] Cross-tenant isolation working

---

## Step 10: Verify All USER_FLOW.md Gaps Resolved

### 10.1 Critical Gaps from USER_FLOW.md

**Original Issue #1:** Auth Broken - No auth guard on `/(main)` routes

**Test:**

1. Log out: http://localhost:3000/login → click "Cerrar sesión" (if available) OR clear cookies
2. Try to access: http://localhost:3000/dashboard

**Expected:** Redirects to `/login` (not accessible without auth)

**✅ RESOLVED:**

- [ ] Dashboard redirects to login when not authenticated
- [ ] Planeaciones redirects to login
- [ ] Configuracion redirects to login

---

**Original Issue #2:** Data Loss - Onboarding collects grade/editorial but never saves them

**Verify in database:**

```sql
SELECT email, full_name, grade, editorial
FROM teachers
WHERE email = 'test@maestraai.mx';
```

**Expected:**

```
email: test@maestraai.mx
full_name: María García López
grade: Kinder 3
editorial: Richmond
```

**✅ RESOLVED:**

- [ ] grade column populated
- [ ] editorial column populated
- [ ] No data loss during onboarding

---

**Original Issue #3:** Missing Links - Teachers created with NULL school_id

**Verify:**

```sql
SELECT email, school_id IS NOT NULL as has_school
FROM teachers
WHERE email = 'test@maestraai.mx';
```

**Expected:**

```
has_school: true
```

**✅ RESOLVED:**

- [ ] school_id is NOT NULL
- [ ] Teacher linked to school during onboarding

---

**Original Issue #4:** Hardcoded IDs - Planeaciones uses fixed group UUID

**Verify:**

```sql
SELECT DISTINCT group_id
FROM fortnights
WHERE teacher_id = (SELECT id FROM teachers WHERE email = 'test@maestraai.mx');
```

**Expected:** Should return 2 different UUIDs (one for each group)

**NOT expected:** Single hardcoded UUID '91000000-0000-0000-0000-000000000001'

**✅ RESOLVED:**

- [ ] Multiple different group_ids present
- [ ] No hardcoded UUID
- [ ] Dynamic group selection working

---

**Original Issue #5:** Security Risk - Single shared RICHMOND_INGEST_TOKEN

**Verify token removed from code:**

```bash
# Search codebase for old token usage
grep -r "RICHMOND_INGEST_TOKEN" app/api/richmond/ingest/route.ts

# Should return NO results
```

**Verify new API key system:**

```sql
SELECT COUNT(*) as total_api_keys
FROM api_keys;

-- Should be > 0 (at least one per teacher)
```

**✅ RESOLVED:**

- [ ] Old env token not used in code
- [ ] Per-user API keys in database
- [ ] Bcrypt hashing confirmed

---

**Original Issue #6:** Extension Locked - Only supports 2 hardcoded groups

**Check extension code:**

```bash
# Old code had: const GROUP_UUID_MAP = { 'grupo-aca6e': ..., 'grupo-b01f6': ... }
# New code should have: let GROUP_UUID_MAP = {} (loaded dynamically)

grep -A 5 "GROUP_UUID_MAP" extension/content.js
```

**Expected:** `let GROUP_UUID_MAP = {}` (not hardcoded)

**✅ RESOLVED:**

- [ ] GROUP_UUID_MAP is empty by default
- [ ] Loaded dynamically from /api/richmond/groups
- [ ] Supports unlimited groups

---

## Step 11: Error Scenarios & Edge Cases

### 11.1 Test No Groups Scenario

**Create third user without groups:**

1. Register: `test3@maestraai.mx`
2. Complete onboarding steps 1-4 (name, grade, editorial, school)
3. **Skip group creation** (close browser or navigate away)

**Navigate to:** `/planeaciones/nueva`

**Expected:**

- Redirects to `/configuracion?message=create_group_first`
- OR shows message: "Create a group first"

**✅ Verification:**

- [ ] Cannot create planeación without group
- [ ] User prompted to create group

### 11.2 Test Revoked API Key in Extension

1. In settings, revoke the API key used in extension
2. Open extension popup
3. Click "Probar Conexión"

**Expected:**

- Red dot
- Error message: "Clave API inválida o revocada"

**✅ Verification:**

- [ ] Revoked key rejected
- [ ] Clear error message shown

### 11.3 Test Empty API Key Input

1. In extension popup, clear the API key field
2. Click "Guardar Configuración"

**Expected:**

- Error message: "Por favor ingresa una clave API"
- Configuration NOT saved

**✅ Verification:**

- [ ] Empty key rejected
- [ ] User prompted to enter key

### 11.4 Test Duplicate School Names

**Create fourth user:**

1. Register: `test4@maestraai.mx`
2. In onboarding school step, create new school with SAME name: "Colegio Americano de México"

**Expected:** School is created (no uniqueness constraint)

**Verify:**

```sql
SELECT id, name, city
FROM schools
WHERE name = 'Colegio Americano de México';
```

**Expected:** 2 rows (duplicate names allowed by design)

**✅ Verification:**

- [ ] Duplicate school names allowed
- [ ] Each school has unique id
- [ ] No errors during creation

---

## Step 12: Performance & Load Testing

### 12.1 Test with Many Groups

**As User 1, create 10 more groups:**

```sql
-- Run this to create 10 additional groups quickly
DO $$
DECLARE
  teacher_uuid UUID := (SELECT id FROM teachers WHERE email = 'test@maestraai.mx');
  school_uuid UUID := (SELECT school_id FROM teachers WHERE email = 'test@maestraai.mx');
  i INT;
BEGIN
  FOR i IN 3..12 LOOP
    INSERT INTO groups (school_id, titular_teacher_id, name, grade, academic_year)
    VALUES (school_uuid, teacher_uuid, 'Grupo ' || i, 'Kinder 3', '2025-2026');
  END LOOP;
END $$;
```

**Test group selector load time:**

1. Navigate to `/planeaciones/nueva`
2. Open browser DevTools → Network tab
3. Measure page load time

**Expected:** < 1 second to load groups

**Test extension group loading:**

1. Open extension popup
2. Click "Probar Conexión"
3. Measure response time

**Expected:** < 2 seconds to load 12 groups

**✅ Verification:**

- [ ] Dropdown loads all 12 groups
- [ ] Page remains responsive
- [ ] No lag or freeze
- [ ] Extension shows "Grupos sincronizando: 12"

---

## Step 13: Final Verification Checklist

### Database Integrity

Run this comprehensive check:

```sql
-- Complete system health check
SELECT
  'Teachers' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE auth_id IS NOT NULL) as with_auth,
  COUNT(*) FILTER (WHERE school_id IS NOT NULL) as with_school,
  COUNT(*) FILTER (WHERE grade IS NOT NULL) as with_grade
FROM teachers

UNION ALL

SELECT
  'Schools',
  COUNT(*),
  COUNT(*) FILTER (WHERE name IS NOT NULL),
  COUNT(*) FILTER (WHERE city IS NOT NULL),
  COUNT(*) FILTER (WHERE state IS NOT NULL)
FROM schools

UNION ALL

SELECT
  'Groups',
  COUNT(*),
  COUNT(*) FILTER (WHERE titular_teacher_id IS NOT NULL),
  COUNT(*) FILTER (WHERE school_id IS NOT NULL),
  COUNT(*) FILTER (WHERE richmond_group_slug IS NOT NULL)
FROM groups

UNION ALL

SELECT
  'API Keys',
  COUNT(*),
  COUNT(*) FILTER (WHERE revoked_at IS NULL),
  COUNT(*) FILTER (WHERE last_used_at IS NOT NULL),
  COUNT(*) FILTER (WHERE LENGTH(key_hash) = 60)
FROM api_keys

UNION ALL

SELECT
  'Fortnights',
  COUNT(*),
  COUNT(DISTINCT teacher_id),
  COUNT(DISTINCT group_id),
  COUNT(*) FILTER (WHERE status = 'draft')
FROM fortnights;
```

**Expected output:**

```
table_name | total_records | with_auth | with_school | with_grade
Teachers   | 4             | 4         | 4           | 4
Schools    | 3             | 3         | 3           | 3
Groups     | 14            | 14        | 14          | 4 (some may not have slug)
API Keys   | 5             | 4         | 2           | 5 (all have valid hash)
Fortnights | 2             | 2         | 2           | 2
```

**✅ All systems check:**

- [ ] All teachers have auth_id
- [ ] All teachers have school_id
- [ ] All teachers have grade saved
- [ ] All groups have titular_teacher_id
- [ ] All API keys have valid bcrypt hash
- [ ] Fortnights link to valid groups

---

## Step 14: Documentation Review

### 14.1 Verify .env.local Updated

```bash
# Should NOT contain RICHMOND_INGEST_TOKEN
cat .env.local | grep -i "RICHMOND_INGEST"

# Expected: no output (line removed)
```

**✅ Verification:**

- [ ] Old token removed
- [ ] Only required env vars present

### 14.2 Check Migration 007 in Version Control

```bash
# Verify migration file exists
ls -la supabase/migrations/007_multi_tenant_setup.sql

# Expected: file exists with recent timestamp
```

**✅ Verification:**

- [ ] Migration 007 present
- [ ] File contains all schema changes

### 14.3 Review Updated PROGRESS.md

```bash
cat docs/PROGRESS.md | grep -A 20 "Phase 2.5"
```

**Expected:** Shows "COMPLETE" status with all features listed

**✅ Verification:**

- [ ] PROGRESS.md updated
- [ ] Phase 2.5 marked COMPLETE
- [ ] All features documented

---

## Common Issues & Solutions

### Issue: "relation 'api_keys' does not exist"

**Cause:** Migration 007 not run

**Solution:**

```sql
-- Run migration 007 in Supabase SQL Editor
-- See Step 1.1
```

### Issue: Extension shows "Clave API inválida" with correct key

**Cause:** Last_used_at update might have failed

**Debug:**

```sql
SELECT
  key_prefix,
  last_used_at,
  revoked_at
FROM api_keys
WHERE teacher_id = (SELECT id FROM teachers WHERE email = 'test@maestraai.mx');
```

**Solution:** Check revoked_at is NULL, regenerate key if needed

### Issue: Groups dropdown empty in planeaciones

**Cause:** No groups linked to teacher

**Debug:**

```sql
SELECT COUNT(*)
FROM groups
WHERE titular_teacher_id = (SELECT id FROM teachers WHERE email = 'test@maestraai.mx');
```

**Solution:** Create at least one group in settings

### Issue: Extension content script not loading groups

**Cause:** CORS or fetch error

**Debug:** Open browser console on Richmond page, look for:

```
[MaestraAI] Failed to load group mappings: <error>
```

**Solution:**

- Verify apiUrl is correct (http://localhost:3000)
- Check API key is valid
- Verify /api/richmond/groups endpoint is accessible

---

## Success Criteria Summary

**✅ All must pass for complete validation:**

### Onboarding

- [ ] 7-step wizard completes without errors
- [ ] All data saved (name, grade, editorial, school, group, API key)
- [ ] No SQL required

### Database

- [ ] Teachers have school_id (not NULL)
- [ ] Groups have titular_teacher_id
- [ ] API keys use bcrypt hashing
- [ ] No hardcoded UUIDs in fortnights

### Security

- [ ] Auth guard blocks unauthenticated access
- [ ] Per-user API keys working
- [ ] Cross-tenant isolation verified
- [ ] Revoked keys rejected

### UI Functionality

- [ ] Settings allows group management
- [ ] Planeaciones has dynamic group selector
- [ ] API key manager generates/revokes keys
- [ ] Extension shows connection status

### Extension

- [ ] Loads GROUP_UUID_MAP dynamically
- [ ] Test connection works
- [ ] Invalid keys rejected
- [ ] Shows correct teacher name and group count

---

## Final Report

After completing all tests, fill in this summary:

**Date:** ******\_\_\_******
**Tester:** ******\_\_\_******

**Migration Status:**

- [ ] Migration 007 run successfully
- [ ] All tables created
- [ ] RLS policies active

**Onboarding Flow:**

- [ ] User 1 completed (email: ****\_\_\_\_****)
- [ ] User 2 completed (email: ****\_\_\_\_****)
- [ ] All steps functional

**Critical Features:**

- [ ] Dynamic group selection working
- [ ] Per-user API keys functional
- [ ] Extension auto-discovery working
- [ ] Cross-tenant isolation verified

**Issues Found:**

1. ***
2. ***
3. ***

**Overall Status:** ☐ PASS ☐ FAIL

**Next Steps:**

- ***
- ***
