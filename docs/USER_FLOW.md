# MaestraAI - Complete User Flow & Data Model

## Overview: User Journey

```
1. Registration → 2. Onboarding → 3. Dashboard → 4. Richmond Setup → 5. Create Planeación
```

---

## 1️⃣ Registration Flow

### What Happens

**Page:** `/register`

**User Actions:**

1. Enter email
2. Enter password (min 6 chars)
3. Click "Crear cuenta"

**System Actions:**

```typescript
// Creates entry in Supabase Auth
supabase.auth.signUp({ email, password })

// Creates auth.users record
auth.users {
  id: uuid,              // ← This becomes auth_id in teachers table
  email: string,
  encrypted_password: string,
  created_at: timestamp
}
```

**Result:** Redirects to `/onboarding`

### Potential Issues

⚠️ **Email Confirmation:** If enabled in Supabase settings, user must verify email before logging in.

**Check Supabase Settings:**

- Dashboard → Authentication → Settings
- Email confirmation: Should be DISABLED for development
- Enable in production with proper email templates

---

## 2️⃣ Onboarding Flow

### What Happens

**Page:** `/onboarding`

**User Actions (3-step wizard):**

1. Enter full name (e.g., "María García")
2. Enter grade (e.g., "Kinder 3")
3. Enter editorial (e.g., "Richmond")
4. Click "Finalizar"

**System Actions:**

```typescript
// Gets current authenticated user
const { data: { user } } = await supabase.auth.getUser()

// Creates teacher record
INSERT INTO teachers (auth_id, full_name, email, role)
VALUES (user.id, answers.full_name, user.email, 'titular')

// Data model:
teachers {
  id: uuid,                    // ← New UUID for teacher
  auth_id: uuid,               // ← Links to auth.users.id
  school_id: uuid,             // ⚠️ Currently NULL - not set during onboarding
  full_name: string,
  email: string,
  role: 'titular' | 'auxiliar'
}
```

**Result:** Redirects to `/dashboard`

### ⚠️ Critical Gap: Missing School/Group Assignment

**Current State:**

- Teacher is created WITHOUT school_id
- Teacher is NOT linked to any groups
- `school_id` is NULL
- No group assignment

**Impact:**

- Teacher can access dashboard
- Cannot see students (no group link)
- Cannot create planeaciones properly (group_id hardcoded)
- Richmond sync may not work correctly

**What's Missing:**

```typescript
// Need to add during onboarding or after:
1. Link teacher to school
2. Link teacher to group(s) via groups.titular_teacher_id
```

---

## 3️⃣ Dashboard & Profile

### What Happens

**Page:** `/dashboard`

**System Checks:**

1. Is user authenticated? → If no, redirect to `/login`
2. Does teacher record exist? → If no, show "Completa tu perfil"
3. Load last Richmond sync status

**Data Queries:**

```sql
-- Get teacher record
SELECT * FROM teachers WHERE auth_id = auth.uid()

-- Get last sync (if teacher exists)
SELECT * FROM richmond_sync_log
WHERE teacher_id = <teacher.id>
ORDER BY started_at DESC
LIMIT 1
```

### Profile Configuration

**Page:** `/configuracion`

**Can Update:**

- ✅ Full name
- ❌ School (not in UI)
- ❌ Groups (not in UI)
- ❌ Grade/Editorial (not stored in teachers table)

**Missing Features:**

- School selector/creator
- Group management
- Teacher profile completion

---

## 4️⃣ Richmond Integration Flow

### Architecture

```
Richmond LP Website (richmondlp.com)
         ↓
Chrome Extension (intercepts XHR)
         ↓
Background Script (background.js)
         ↓
POST /api/richmond/ingest (with Bearer token)
         ↓
Supabase (richmond_assignments, richmond_scores)
```

### Step-by-Step: Richmond Setup

#### A. Extension Installation

**File:** `extension/README.md`

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/extension` folder
5. Extension icon appears in toolbar

#### B. Extension Configuration

**UI:** Click extension icon → Popup shows

**Required Settings:**

- **Sync Token:** Single shared token from `.env`
- **MaestraAI URL:** `http://localhost:3000` or `https://maestraai.mx`

**Current Implementation:**

```javascript
// popup.js
chrome.storage.sync.set({
  syncToken: '<RICHMOND_INGEST_TOKEN>',
  apiUrl: 'http://localhost:3000',
})
```

**⚠️ Security Issue:**

- Uses single shared token (`RICHMOND_INGEST_TOKEN`)
- NOT per-user authentication
- Anyone with token can ingest data to ANY group

**Better Implementation (Future):**

- Generate per-user API keys in `/configuracion`
- Store in `richmond_credentials` table
- Extension uses user-specific token

#### C. How the Extension Works

**1. User logs into richmondlp.com**

```
User enters credentials on Richmond website
→ Richmond sets session cookies
→ User navigates to Markbook page
```

**2. Extension intercepts API calls**

**File:** `extension/content.js`

```javascript
// Overrides XMLHttpRequest.prototype.open
// Intercepts calls to: /api/course_modules/{uuid}/assignment_scores.json

// Maps Richmond slugs to MaestraAI group IDs:
const GROUP_MAP = {
  'grupo-aca6e': '91000000-0000-0000-0000-000000000001', // Preprimaria A
  'grupo-b01f6': '92000000-0000-0000-0000-000000000002', // Preprimaria B
}
```

**3. Background script sends to MaestraAI**

**File:** `extension/background.js`

```javascript
fetch('http://localhost:3000/api/richmond/ingest', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${syncToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    group_id: mappedGroupId,
    data: assignmentScores,
  }),
})
```

**4. API processes and stores**

**File:** `app/api/richmond/ingest/route.ts`

```typescript
1. Verify Bearer token matches RICHMOND_INGEST_TOKEN
2. Get students for group_id
3. For each assignment:
   a. Upsert richmond_assignments table
   b. Match students by richmond_student_id or name
   c. Insert richmond_scores for each student
4. Return success/error
```

### Data Model: Richmond Tables

```sql
-- Stores Richmond session cookies (encrypted)
richmond_credentials {
  teacher_id: uuid → teachers.id,
  session_cookie_encrypted: text,  -- AES-256-GCM encrypted
  is_valid: boolean,
  last_synced_at: timestamp
}

-- Sync log entries
richmond_sync_log {
  teacher_id: uuid,
  group_id: uuid,
  started_at: timestamp,
  status: 'success' | 'error' | 'session_expired',
  assignments_synced: int,
  scores_synced: int
}

-- Assignment metadata
richmond_assignments {
  group_id: uuid → groups.id,
  richmond_id: string,              -- Richmond's assignment ID
  title: string,
  due_at: timestamp,
  total_students: int,
  total_submitted: int
}

-- Individual student scores
richmond_scores {
  assignment_id: uuid → richmond_assignments.id,
  student_id: uuid → students.id,   -- Matched student
  richmond_student_id: string,
  total_score: decimal,
  progress: 'completed' | 'in_progress' | 'not_started'
}
```

### Current Limitations

❌ **No per-teacher authentication** - uses shared token
❌ **Hardcoded group mapping** - extension has fixed UUID map
❌ **No Richmond credential storage UI** - no way to save session cookies
❌ **Manual extension setup** - must configure token manually

---

## 5️⃣ Creating a Planeación

### Flow

**Page:** `/planeaciones` → Click "Nueva Planeación"

**Form Fields:**

- Fortnight number (1-12)
- Start date
- End date
- Project name
- Monthly value (e.g., "Respeto")
- Letter week 1 (A-Z)
- Letter week 2 (A-Z)

**System Actions:**

```typescript
// Get teacher
const { data: teacher } = await supabase
  .from('teachers')
  .select('id')
  .eq('auth_id', user.id)
  .single()

// ⚠️ HARDCODED GROUP ID
INSERT INTO fortnights (
  teacher_id,
  group_id,  // ← FIXED: '91000000-0000-0000-0000-000000000001'
  number,
  start_date,
  end_date,
  project_name,
  monthly_value,
  letter_week1,
  letter_week2,
  status: 'draft'
)
```

**Data Model:**

```sql
fortnights {
  id: uuid,
  group_id: uuid → groups.id,      -- ⚠️ Hardcoded in code
  teacher_id: uuid → teachers.id,
  number: int (1-12),
  start_date: date,
  end_date: date,
  project_name: string,
  monthly_value: string,
  letter_week1: char(1),
  letter_week2: char(1),
  status: 'draft' | 'approved'
}
```

**Result:** Redirects to `/planeaciones/{fortnight_id}`

### ⚠️ Critical Issue: No Group Selection

**Problem:**

- User cannot select which group to plan for
- Always uses hardcoded group ID
- If teacher has multiple groups, cannot differentiate

**Fix Needed:**

1. Load teacher's groups
2. Add group selector to form
3. Store selected group_id in fortnight

---

## 🔗 Complete Data Model & Relationships

### Entity Relationship Diagram

```
auth.users (Supabase Auth)
  ↓ [1:1] auth_id
teachers
  ↓ [1:N] titular_teacher_id          ↓ [1:N] teacher_id
groups ←─────────────────────────── fortnights
  ↓ [1:N] group_id                     ↓ [1:N] fortnight_id
students                            lesson_plans
  ↓ [1:N] student_id
richmond_scores
  ↓ [N:1] assignment_id
richmond_assignments
  ↓ [N:1] group_id
groups (same as above)
```

### Critical Relationships

**1. Auth → Teacher (1:1)**

```sql
teachers.auth_id = auth.users.id
```

✅ Created during onboarding
⚠️ Must exist for app to work

**2. Teacher → Groups (1:N)**

```sql
groups.titular_teacher_id = teachers.id
```

❌ NOT created during onboarding
⚠️ Must be created manually or via separate flow

**3. Groups → Students (1:N)**

```sql
students.group_id = groups.id
```

✅ Seeded via seed_step2.sql
⚠️ No UI to add/edit students yet

**4. Teacher → Fortnights (1:N)**

```sql
fortnights.teacher_id = teachers.id
```

✅ Created when user creates planeación
⚠️ group_id is hardcoded, not dynamic

**5. Groups → Richmond Data (1:N)**

```sql
richmond_assignments.group_id = groups.id
richmond_scores.student_id = students.id (via group)
```

✅ Synced via Chrome extension
⚠️ Requires group IDs to match extension mapping

---

## 🚨 Current Gaps & Issues

### Critical

1. **❌ No School Assignment**
   - Teachers created without school_id
   - Cannot query "all teachers in my school"

2. **❌ No Group Assignment UI**
   - Teachers not linked to groups during onboarding
   - Must be done manually via SQL

3. **❌ Hardcoded Group ID**
   - Planeaciones always use '91000000-0000-0000-0000-000000000001'
   - Cannot select group when creating planeación

4. **❌ Shared Extension Token**
   - Single RICHMOND_INGEST_TOKEN for all users
   - No per-user authentication
   - Security risk

5. **❌ No Student Management**
   - Cannot add/edit students via UI
   - Must use SQL or seed files

### Minor

6. **⚠️ Email Confirmation**
   - If enabled, blocks login after registration
   - Need to verify email before accessing app

7. **⚠️ No Profile Completion Check**
   - Onboarding can be skipped
   - No validation that teacher has school/groups

8. **⚠️ No Extension Setup Guide in App**
   - Extension README exists but not linked in UI
   - `/configuracion` shows "Ver instrucciones" but links to `/extension/README.md` (404 in browser)

---

## ✅ What Works Currently

1. **✅ Registration & Login**
   - Auth.users creation works
   - Login/logout functional
   - Session management works

2. **✅ Onboarding Wizard**
   - 3-step wizard functional
   - Creates teacher record
   - Links teacher.auth_id to auth.users.id

3. **✅ Dashboard**
   - Loads teacher data
   - Shows Richmond sync status
   - Zero-states work correctly

4. **✅ Planeación Creation**
   - Form validation works
   - Creates fortnight record
   - Redirects to detail page

5. **✅ Richmond Extension (if configured)**
   - Intercepts XHR calls correctly
   - Maps group slugs to UUIDs
   - Sends data to /api/richmond/ingest
   - Shows notifications

6. **✅ Data Persistence**
   - All tables created via migrations
   - RLS policies active
   - Relationships enforced

---

## 🛠️ How to Set Up a Complete User (Current Process)

### Option A: Via UI (Partial)

```bash
1. npm run dev
2. Navigate to http://localhost:3000
3. Click "Regístrate"
4. Enter email + password → Creates auth.users
5. Complete onboarding (3 questions) → Creates teachers record
6. ⚠️ STOPS HERE - Cannot assign school or groups via UI
```

**Then must do via SQL:**

```sql
-- Get your teacher ID
SELECT id, auth_id, email FROM teachers WHERE email = 'your@email.com';

-- Update school (if you have one)
UPDATE teachers SET school_id = '<SCHOOL_UUID>' WHERE id = '<TEACHER_ID>';

-- Link to group (update existing group)
UPDATE groups
SET titular_teacher_id = '<TEACHER_ID>'
WHERE id = '91000000-0000-0000-0000-000000000001';

-- Or create new group
INSERT INTO groups (school_id, titular_teacher_id, name, grade, academic_year)
VALUES ('<SCHOOL_ID>', '<TEACHER_ID>', 'Kinder 3A', 'Kinder 3', '2025-2026')
RETURNING id;
```

### Option B: Full SQL Setup (Recommended for Testing)

See `SETUP_CHECKLIST.md` section "Option B: Manual SQL Setup"

**Creates:**

1. Auth user (Supabase Auth dashboard)
2. School record
3. Teacher record (with school_id)
4. Group record (with titular_teacher_id)
5. Students (via seed file)

---

## 🔧 Recommended Fixes (Priority Order)

### P0 - Critical (Blocks core functionality)

1. **Add Group Selector to Nueva Planeación**
   - Load teacher's groups
   - Let user select group
   - Remove hardcoded group_id

2. **Link Teacher to Groups During Onboarding**
   - Add "Select your group" step to onboarding
   - Or assign default group based on school

### P1 - High (Improves UX significantly)

3. **Add School/Group Management to Configuración**
   - Create/select school
   - Assign teacher to groups
   - View students in groups

4. **Generate Per-User Extension Tokens**
   - Create API key generation in `/configuracion`
   - Store in richmond_credentials table
   - Update extension to use user-specific tokens

### P2 - Medium (Nice to have)

5. **Extension Setup Guide in App**
   - Add `/docs/extension-setup` page
   - Link from `/configuracion`
   - Show QR code + download link

6. **Student Management UI**
   - Add/edit students in groups
   - Import from CSV
   - Link to Richmond student IDs

---

## 📋 Testing Checklist (With Current Limitations)

### ✅ What You Can Test Now

- [ ] Register new account
- [ ] Complete onboarding wizard
- [ ] View dashboard (may show "no teacher" if not linked)
- [ ] View planeaciones (will be empty)
- [ ] Create nueva planeación (uses hardcoded group)
- [ ] View planeación detail

### ⚠️ What Requires Manual Setup

- [ ] Link teacher to school (SQL required)
- [ ] Link teacher to groups (SQL required)
- [ ] Install Chrome extension
- [ ] Configure extension token (from .env)
- [ ] Test Richmond sync (requires Richmond account + session)

### ❌ What Doesn't Work Yet

- [ ] Select group when creating planeación (hardcoded)
- [ ] Add/edit students via UI (SQL only)
- [ ] Generate extension API token in app (uses .env token)
- [ ] Complete profile in configuración (missing fields)
