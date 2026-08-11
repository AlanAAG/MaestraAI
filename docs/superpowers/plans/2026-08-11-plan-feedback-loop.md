# Plan Feedback Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teacher rates each planeación (1–5 stars + global comment) and leaves Word-style comments on sections; a section comment can regenerate that section immediately, and all feedback feeds the existing learned-preferences distiller.

**Architecture:** One new table (`plan_feedback`, migration 070) + two API routes (`/api/planner/feedback` upsert/read, `/api/planner/regenerate-section` AI single-section rewrite) + minimal UI inside `PlanDocumentViewer` (a `feedbackKey` prop on the existing `DocSection` + one footer row). The distiller in `lib/planner/learning.ts` gains feedback as a third input. No custom model.

**Tech Stack:** Next.js 14 App Router, Supabase (RLS, pgvector already enabled), Zod, Claude via existing `callPlannerModel`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-10-plan-feedback-loop-design.md`

## Global Constraints

- Do NOT change the visual design of the plan document: same fonts, colors, spacing. All feedback UI is `print:hidden`, invisible until used, and never appears in DOCX/PDF export.
- Never numeric grades for students — this rating is the teacher rating the AI, allowed.
- Zod on every API route input. RLS owner-only on the new table. Never call Claude from the client.
- Run `npm run typecheck` after every TypeScript change (a hook enforces it).
- All user-facing copy in Spanish (es-MX). Icons: Lucide only, no emoji icons.
- Migration numbering: next is `070`. The remote ledger is repaired, so `supabase db push` works normally now.
- Existing suite (207 tests) must stay green after every task.

---

### Task 1: Migration 070 — `plan_feedback` table

**Files:**

- Create: `supabase/migrations/070_plan_feedback.sql`

**Interfaces:**

- Produces: table `plan_feedback(id, teacher_id, fortnight_id, section_key, rating, comment, embedding, created_at)` with two partial unique indexes used as upsert conflict targets by Task 2:
  - `plan_feedback_global_uniq` on `(fortnight_id, teacher_id)` where `section_key is null`
  - `plan_feedback_section_uniq` on `(fortnight_id, teacher_id, section_key)` where `section_key is not null`

- [ ] **Step 1: Write the migration**

```sql
-- Explicit teacher feedback on generated planeaciones: a global rating+comment per plan and
-- Word-style comments per section. Feeds the learning distiller (lib/planner/learning.ts) and
-- the regenerate-section flow. Additive; RLS owner-only (same pattern as plan_corrections 055).

create table if not exists plan_feedback (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  fortnight_id uuid not null references fortnights(id) on delete cascade,
  -- null = global feedback for the whole document; else a plan_document section key.
  section_key  text,
  -- 1-5, global rows only (the teacher rating the AI — not a student grade).
  rating       int check (rating between 1 and 5),
  comment      text check (char_length(comment) <= 2000),
  -- Reserved for future retrieval (approach B in the spec). Unused today.
  embedding    vector(1536),
  created_at   timestamptz not null default now(),
  check (rating is not null or comment is not null)
);

-- Upsert targets: one global row per (plan, teacher); latest comment per section wins.
create unique index if not exists plan_feedback_global_uniq
  on plan_feedback (fortnight_id, teacher_id) where section_key is null;
create unique index if not exists plan_feedback_section_uniq
  on plan_feedback (fortnight_id, teacher_id, section_key) where section_key is not null;
create index if not exists plan_feedback_teacher_idx
  on plan_feedback (teacher_id, created_at desc);

alter table plan_feedback enable row level security;
drop policy if exists "own plan feedback" on plan_feedback;
create policy "own plan feedback" on plan_feedback
  for all
  using (teacher_id in (select id from teachers where auth_id = auth.uid()))
  with check (teacher_id in (select id from teachers where auth_id = auth.uid()));
```

- [ ] **Step 2: Apply and verify**

Run: `supabase db push`
Expected: `070_plan_feedback.sql` applied without error.
Verify: `node -e "require('dotenv').config({path:'.env.local'}); const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY; fetch(u+'/rest/v1/plan_feedback?select=id&limit=1',{headers:{apikey:k,Authorization:'Bearer '+k}}).then(r=>console.log(r.status))"` → `200`

- [ ] **Step 3: Regenerate DB types**

Run: `supabase gen types typescript --linked > lib/database.types.ts && npm run typecheck`
Expected: typecheck passes; `lib/database.types.ts` contains `plan_feedback`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/070_plan_feedback.sql lib/database.types.ts
git commit -m "feat(feedback): plan_feedback table (rating + section comments), RLS owner-only"
```

---

### Task 2: Feedback API — `POST/GET /api/planner/feedback`

**Files:**

- Create: `lib/planner/feedback.ts` (pure helpers)
- Create: `lib/planner/feedback.test.ts`
- Create: `app/api/planner/feedback/route.ts`

**Interfaces:**

- Consumes: `plan_feedback` table (Task 1).
- Produces (used by Tasks 3, 4, 5):
  - `type FeedbackRow = { section_key: string | null; rating: number | null; comment: string | null }`
  - `feedbackConflictTarget(sectionKey: string | null): string` → the upsert `onConflict` columns
  - `FEEDBACK_SECTIONS: Set<string>` — section keys a comment may attach to
  - Route contract: `POST {fortnight_id, section_key?, rating?, comment?}` → `{ok:true}`; `GET ?fortnight_id=` → `{feedback: FeedbackRow[]}`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/planner/feedback.test.ts
import { describe, it, expect } from 'vitest'
import { feedbackConflictTarget, FEEDBACK_SECTIONS } from './feedback'

describe('feedbackConflictTarget', () => {
  it('targets the global unique index when no section', () => {
    expect(feedbackConflictTarget(null)).toBe('fortnight_id,teacher_id')
  })
  it('targets the per-section unique index for section comments', () => {
    expect(feedbackConflictTarget('proyecto')).toBe('fortnight_id,teacher_id,section_key')
  })
})

describe('FEEDBACK_SECTIONS', () => {
  it('covers the narrative sections and never structured ones', () => {
    expect(FEEDBACK_SECTIONS.has('proyecto')).toBe(true)
    expect(FEEDBACK_SECTIONS.has('ajustes_razonables')).toBe(true)
    expect(FEEDBACK_SECTIONS.has('custom_sections')).toBe(false)
    expect(FEEDBACK_SECTIONS.has('cronograma')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/planner/feedback.test.ts`
Expected: FAIL — module `./feedback` not found.

- [ ] **Step 3: Write `lib/planner/feedback.ts`**

```typescript
// Pure helpers for plan feedback (global rating + Word-style section comments).
// The routes stay thin; anything with logic lives here so it's testable.

export type FeedbackRow = {
  section_key: string | null
  rating: number | null
  comment: string | null
}

// Narrative sections a comment can attach to (mirrors EDITABLE_SECTIONS in
// app/api/planner/update-document/route.ts, minus structured/meta fields).
export const FEEDBACK_SECTIONS = new Set([
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'ejes_articuladores',
  'proyecto',
  'desarrollo_taller',
])

/** Upsert conflict target — must match the partial unique indexes in migration 070. */
export function feedbackConflictTarget(sectionKey: string | null): string {
  return sectionKey ? 'fortnight_id,teacher_id,section_key' : 'fortnight_id,teacher_id'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/planner/feedback.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the route**

```typescript
// app/api/planner/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { feedbackConflictTarget, FEEDBACK_SECTIONS } from '@/lib/planner/feedback'

const PostSchema = z
  .object({
    fortnight_id: z.string().uuid(),
    section_key: z.string().min(1).max(60).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.rating !== undefined || (d.comment ?? '').length > 0, {
    message: 'rating o comment requerido',
  })

// Ownership: the fortnight must belong to the teacher. Returns teacher id or null.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ownTeacherId(supabase: any, userId: string, fortnightId: string) {
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('auth_id', userId)
    .single()
  if (!teacher) return null
  const { data: fn } = await supabase
    .from('fortnights')
    .select('id, teacher_id')
    .eq('id', fortnightId)
    .single()
  if (!fn || fn.teacher_id !== teacher.id) return null
  return teacher.id as string
}

export async function POST(req: NextRequest) {
  try {
    const body = PostSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    const { fortnight_id, section_key, rating, comment } = body.data
    if (section_key && !FEEDBACK_SECTIONS.has(section_key)) {
      return NextResponse.json({ error: 'Sección no comentable' }, { status: 422 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'standard', 'plan-feedback')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    const teacherId = await ownTeacherId(supabase, user.id, fortnight_id)
    if (!teacherId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plan_feedback').upsert(
      {
        teacher_id: teacherId,
        fortnight_id,
        section_key: section_key ?? null,
        // Section comments carry no rating; global rows keep whichever fields were sent.
        rating: section_key ? null : (rating ?? null),
        comment: comment || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: feedbackConflictTarget(section_key ?? null) }
    )
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[plan-feedback]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const fortnightId = req.nextUrl.searchParams.get('fortnight_id')
    if (!fortnightId || !z.string().uuid().safeParse(fortnightId).success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // RLS scopes rows to the owning teacher — a plain select is safe here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('plan_feedback')
      .select('section_key, rating, comment')
      .eq('fortnight_id', fortnightId)
    return NextResponse.json({ feedback: data ?? [] })
  } catch (err) {
    console.error('[plan-feedback:get]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Typecheck + full feedback tests**

Run: `npm run typecheck && npx vitest run lib/planner/feedback.test.ts`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add lib/planner/feedback.ts lib/planner/feedback.test.ts app/api/planner/feedback/route.ts
git commit -m "feat(feedback): upsert/read API for plan ratings and section comments"
```

---

### Task 3: Regenerate a section from a comment

**Files:**

- Create: `lib/planner/regenerate-section.ts` (pure prompt builder)
- Create: `lib/planner/regenerate-section.test.ts`
- Create: `app/api/planner/regenerate-section/route.ts`

**Interfaces:**

- Consumes: `FEEDBACK_SECTIONS`, `feedbackConflictTarget` (Task 2); `callPlannerModel(system, user, opts)` from `lib/planner/model.ts`; `normalizePlanDocument` from `lib/planner/normalize-document.ts`; `getLearnedProfile(supabase, teacherId, planType)` from `lib/planner/learning.ts`.
- Produces: route contract `POST {fortnight_id, section_key, comment}` → `{ok:true, value: string}` (the new section text). Used by Task 5's UI.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/planner/regenerate-section.test.ts
import { describe, it, expect } from 'vitest'
import { buildRegeneratePrompt, REGENERATE_SYSTEM } from './regenerate-section'

describe('buildRegeneratePrompt', () => {
  const args = {
    sectionKey: 'proyecto',
    currentText: '**Punto de Partida**\n- Actividad inicial.',
    comment: 'Muy corto, agrega más actividades con material concreto',
    projectName: 'Ya soy de Preprimaria',
    preferences: 'Prefiere frases operativas',
  }

  it('includes the current text, the comment and the project', () => {
    const p = buildRegeneratePrompt(args)
    expect(p).toContain('Punto de Partida')
    expect(p).toContain('agrega más actividades')
    expect(p).toContain('Ya soy de Preprimaria')
    expect(p).toContain('proyecto')
  })

  it('includes learned preferences only when present', () => {
    expect(buildRegeneratePrompt(args)).toContain('Prefiere frases operativas')
    expect(buildRegeneratePrompt({ ...args, preferences: '' })).not.toContain(
      '<preferencias_aprendidas>'
    )
  })

  it('system prompt demands ONLY the section text back', () => {
    expect(REGENERATE_SYSTEM).toContain('ÚNICAMENTE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/planner/regenerate-section.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/planner/regenerate-section.ts`**

```typescript
// Rewrite ONE plan section from the teacher's comment. Returns plain markdown for that
// section (no JSON), which then flows through the same save-time normalization as manual edits.

export const REGENERATE_SYSTEM = `Eres una asistente pedagógica experta en preescolar mexicano (NEM 2024). Reescribes UNA sección de una planeación siguiendo la instrucción de la maestra. Conserva todo lo que ella no pidió cambiar: estructura (encabezados en **negritas**, viñetas "- "), tono operativo en primera persona, y contenido que ya estaba bien. Responde ÚNICAMENTE con el texto nuevo de la sección, en markdown, sin explicaciones ni etiquetas.`

export function buildRegeneratePrompt(args: {
  sectionKey: string
  currentText: string
  comment: string
  projectName: string
  preferences?: string
}): string {
  const prefs = args.preferences?.trim()
    ? `\n<preferencias_aprendidas>\n${args.preferences.trim()}\n</preferencias_aprendidas>\n`
    : ''
  return `Proyecto: ${args.projectName}
Sección a reescribir: ${args.sectionKey}
${prefs}
TEXTO ACTUAL DE LA SECCIÓN:
${args.currentText.slice(0, 8000)}

INSTRUCCIÓN DE LA MAESTRA (obligatoria):
${args.comment}

Reescribe la sección completa aplicando la instrucción.`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/planner/regenerate-section.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the route**

```typescript
// app/api/planner/regenerate-section/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { callPlannerModel } from '@/lib/planner/model'
import { normalizePlanDocument } from '@/lib/planner/normalize-document'
import { getLearnedProfile } from '@/lib/planner/learning'
import { FEEDBACK_SECTIONS, feedbackConflictTarget } from '@/lib/planner/feedback'
import { REGENERATE_SYSTEM, buildRegeneratePrompt } from '@/lib/planner/regenerate-section'

export const maxDuration = 120

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  section_key: z.string().min(1).max(60),
  comment: z.string().trim().min(3).max(2000),
})

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    const { fortnight_id, section_key, comment } = body.data
    if (!FEEDBACK_SECTIONS.has(section_key)) {
      return NextResponse.json({ error: 'Sección no regenerable' }, { status: 422 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // AI call → strict tier (same cost class as generation).
    const { success } = await checkRateLimit(user.id, 'strict', 'regenerate-section')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select('id, teacher_id, plan_type, project_name, plan_document')
      .eq('id', fortnight_id)
      .single()
    if (!fn || fn.teacher_id !== teacher.id || !fn.plan_document) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const currentRaw = (fn.plan_document as Record<string, unknown>)[section_key]
    const currentText = typeof currentRaw === 'string' ? currentRaw : ''
    if (!currentText.trim()) {
      return NextResponse.json({ error: 'La sección está vacía' }, { status: 422 })
    }

    // Save the comment as feedback first — even if the model call fails, the signal is kept.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('plan_feedback')
      .upsert(
        {
          teacher_id: teacher.id,
          fortnight_id,
          section_key,
          rating: null,
          comment,
          created_at: new Date().toISOString(),
        },
        { onConflict: feedbackConflictTarget(section_key) }
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(null, (e: any) => console.error('[regenerate-section] feedback save skipped:', e))

    const learned = await getLearnedProfile(
      supabase,
      teacher.id,
      String(fn.plan_type ?? 'quincena')
    )
    const raw = await callPlannerModel(
      REGENERATE_SYSTEM,
      buildRegeneratePrompt({
        sectionKey: section_key,
        currentText,
        comment,
        projectName: String(fn.project_name ?? ''),
        preferences: learned?.preferences ?? '',
      }),
      { maxTokens: 4000 }
    )
    const value = raw.trim()
    if (!value) return NextResponse.json({ error: 'La IA no devolvió texto.' }, { status: 502 })

    // Same save path as a manual edit: normalize (bullets/momentos/acronym) then persist.
    const updated = normalizePlanDocument({
      ...(fn.plan_document as Record<string, unknown>),
      [section_key]: value,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('fortnights')
      .update({ plan_document: updated })
      .eq('id', fortnight_id)
    if (error) throw error

    // The implicit loop learns from this too (original → regenerated).
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('plan_corrections').insert({
        teacher_id: teacher.id,
        fortnight_id,
        section: section_key,
        original: currentText.slice(0, 6000),
        edited: String(updated[section_key] ?? value).slice(0, 6000),
      })
    } catch (e) {
      console.error('[regenerate-section] correction capture skipped:', e)
    }

    return NextResponse.json({ ok: true, value: String(updated[section_key] ?? value) })
  } catch (err) {
    console.error('[regenerate-section]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Typecheck + tests**

Run: `npm run typecheck && npx vitest run lib/planner`
Expected: pass, no regressions.

- [ ] **Step 7: Commit**

```bash
git add lib/planner/regenerate-section.ts lib/planner/regenerate-section.test.ts app/api/planner/regenerate-section/route.ts
git commit -m "feat(feedback): regenerate a plan section from the teacher's comment"
```

---

### Task 4: Feedback feeds the distiller

**Files:**

- Modify: `lib/planner/learning.ts` (function `buildDistillUserPrompt` ~line 36; function `refreshLearnedProfile` ~line 102)
- Modify: `lib/planner/learning.test.ts`

**Interfaces:**

- Consumes: `FeedbackRow` from `lib/planner/feedback.ts` (Task 2).
- Produces: `buildDistillUserPrompt(planTexts: string[], corrections: Correction[], feedback?: FeedbackRow[]): string` — third param optional so existing callers/tests keep compiling.

- [ ] **Step 1: Write the failing test (append to `lib/planner/learning.test.ts`)**

```typescript
describe('buildDistillUserPrompt with feedback', () => {
  it('includes ratings and comments as a feedback block', () => {
    const p = buildDistillUserPrompt(
      [],
      [],
      [
        { section_key: null, rating: 2, comment: 'Muy genérica' },
        { section_key: 'proyecto', rating: null, comment: 'Faltan materiales concretos' },
      ]
    )
    expect(p).toContain('FEEDBACK DIRECTO')
    expect(p).toContain('2/5')
    expect(p).toContain('Muy genérica')
    expect(p).toContain('proyecto')
    expect(p).toContain('Faltan materiales concretos')
  })

  it('omits the block when there is no feedback', () => {
    expect(buildDistillUserPrompt([], [])).not.toContain('FEEDBACK DIRECTO')
  })
})
```

Also update the test file's import to `import { isStale, buildDistillUserPrompt } from './learning'` (unchanged) — the new cases just call it with a third argument.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/planner/learning.test.ts`
Expected: FAIL — 3rd argument ignored / `FEEDBACK DIRECTO` missing.

- [ ] **Step 3: Implement in `lib/planner/learning.ts`**

Add the import at the top:

```typescript
import type { FeedbackRow } from './feedback'
```

Replace the `buildDistillUserPrompt` function with:

```typescript
export function buildDistillUserPrompt(
  planTexts: string[],
  corrections: Correction[],
  feedback: FeedbackRow[] = []
): string {
  const plans = planTexts
    .map((t, i) => `--- Planeación ${i + 1} ---\n${t.slice(0, 2000)}`)
    .join('\n\n')
  const corr = corrections
    .map(
      (c) =>
        `Sección "${c.section}":\nANTES (IA): ${(c.original ?? '').slice(0, 500)}\nDESPUÉS (maestra): ${(c.edited ?? '').slice(0, 500)}`
    )
    .join('\n\n')
  // Explicit signal: what she SAID about the output. Low ratings' comments are the
  // highest-priority preferences (she took the time to explain what was wrong).
  const fb = feedback
    .filter((f) => f.rating != null || (f.comment ?? '').trim())
    .map((f) => {
      const scope = f.section_key ? `Sección "${f.section_key}"` : 'Planeación completa'
      const stars = f.rating != null ? ` — calificación ${f.rating}/5` : ''
      return `${scope}${stars}: ${(f.comment ?? '').slice(0, 500)}`
    })
    .join('\n')
  const fbBlock = fb
    ? `\n\nFEEDBACK DIRECTO DE LA MAESTRA (máxima prioridad, en especial los comentarios con calificación baja):\n${fb}`
    : ''
  return `PLANEACIONES RECIENTES DE LA MAESTRA:\n${plans || '(ninguna)'}\n\nCORRECCIONES QUE HIZO (lo que la IA escribió vs lo que ella prefirió):\n${corr || '(ninguna)'}${fbBlock}`
}
```

In `refreshLearnedProfile` (~line 110), after the `plan_corrections` fetch, add the feedback fetch and pass it through:

```typescript
const { data: fbRows } = await supabase
  .from('plan_feedback')
  .select('section_key, rating, comment')
  .eq('teacher_id', teacherId)
  .order('created_at', { ascending: false })
  .limit(20)
```

Change the source count and the distill call:

```typescript
const fb = (fbRows ?? []) as FeedbackRow[]
const sourceCount = planTexts.length + corr.length + fb.length
if (sourceCount === 0) return null
```

```typescript
        { role: 'user', content: buildDistillUserPrompt(planTexts, corr, fb) },
```

(Keep the rest of the function untouched. The `plan_feedback` fetch is inside the existing `try` — if migration 070 isn't applied in an environment, the whole refresh already degrades gracefully.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/planner/learning.test.ts && npm run typecheck`
Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add lib/planner/learning.ts lib/planner/learning.test.ts
git commit -m "feat(feedback): distiller learns from ratings and comments"
```

---

### Task 5: UI — stars footer + Word-style section comments

**Files:**

- Create: `components/planner/PlanFeedback.tsx` (context + footer + comment box, one file — they share state)
- Modify: `components/planner/PlanDocumentViewer.tsx` (`DocSection` ~line 106; `QuincenaSections` keyed cases ~line 826+; taller branch ~line 1120+; provider around the document body in `PlanDocumentViewer` ~line 1052)

**Interfaces:**

- Consumes: `POST/GET /api/planner/feedback` (Task 2), `POST /api/planner/regenerate-section` (Task 3), `FEEDBACK_SECTIONS` semantics (only those keys get the comment icon).
- Produces:
  - `PlanFeedbackProvider({ fortnightId, onReload, children })` — fetches saved feedback on mount, exposes context.
  - `useSectionFeedback(sectionKey?: string)` → `{ comment: string | null, open: boolean, toggle(): void, save(text: string): Promise<void>, regenerate(text: string): Promise<void>, busy: boolean } | null` (null when no provider or no key — DocSection renders nothing extra then, so `/jugar` and other uses are unaffected).
  - `PlanFeedbackFooter()` — the stars + global comment row.
  - `SectionCommentBox({ sectionKey })` — the inline box DocSection renders when open.
  - `DocSection` gains optional prop `feedbackKey?: string`.

- [ ] **Step 1: Write `components/planner/PlanFeedback.tsx`**

```tsx
'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Star, MessageSquare, Loader2, RefreshCw, Check } from 'lucide-react'

// Explicit feedback UI for a generated plan: a global stars row + Word-style per-section
// comments. Invisible until used, print:hidden always — the document design stays untouched.

type FeedbackState = {
  fortnightId: string
  rating: number | null
  globalComment: string
  sectionComments: Record<string, string>
  openSection: string | null
  busySection: string | null
  setOpenSection: (k: string | null) => void
  saveGlobal: (rating: number, comment: string) => Promise<void>
  saveSection: (key: string, comment: string) => Promise<void>
  regenerateSection: (key: string, comment: string) => Promise<void>
}

const Ctx = createContext<FeedbackState | null>(null)

// Sections that accept comments — mirror FEEDBACK_SECTIONS (lib/planner/feedback.ts is
// server-adjacent; re-declared here to keep the client bundle lean, same pattern as
// DEFAULT_QUINCENA_ORDER).
export const COMMENTABLE = new Set([
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'ejes_articuladores',
  'proyecto',
  'desarrollo_taller',
])

export function PlanFeedbackProvider({
  fortnightId,
  onReload,
  children,
}: {
  fortnightId: string
  onReload: () => void
  children: React.ReactNode
}) {
  const [rating, setRating] = useState<number | null>(null)
  const [globalComment, setGlobalComment] = useState('')
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({})
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [busySection, setBusySection] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/planner/feedback?fortnight_id=${fortnightId}`)
      .then((r) => (r.ok ? r.json() : { feedback: [] }))
      .then((d) => {
        const sections: Record<string, string> = {}
        for (const f of d.feedback ?? []) {
          if (f.section_key) sections[f.section_key] = f.comment ?? ''
          else {
            if (f.rating) setRating(f.rating)
            setGlobalComment(f.comment ?? '')
          }
        }
        setSectionComments(sections)
      })
      .catch(() => {})
  }, [fortnightId])

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/planner/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fortnight_id: fortnightId, ...body }),
    })
    if (!res.ok) throw new Error('No se pudo guardar')
  }

  const value: FeedbackState = {
    fortnightId,
    rating,
    globalComment,
    sectionComments,
    openSection,
    busySection,
    setOpenSection,
    saveGlobal: async (r, c) => {
      setRating(r)
      setGlobalComment(c)
      await post({ rating: r, comment: c || undefined })
    },
    saveSection: async (key, c) => {
      await post({ section_key: key, comment: c })
      setSectionComments((p) => ({ ...p, [key]: c }))
      setOpenSection(null)
    },
    regenerateSection: async (key, c) => {
      setBusySection(key)
      try {
        const res = await fetch('/api/planner/regenerate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fortnight_id: fortnightId, section_key: key, comment: c }),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo regenerar')
        setSectionComments((p) => ({ ...p, [key]: c }))
        setOpenSection(null)
        onReload()
      } finally {
        setBusySection(null)
      }
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** DocSection's hook: null (render nothing) unless inside a provider AND a commentable key. */
export function useSectionFeedback(sectionKey?: string) {
  const ctx = useContext(Ctx)
  if (!ctx || !sectionKey || !COMMENTABLE.has(sectionKey)) return null
  return {
    comment: ctx.sectionComments[sectionKey] ?? null,
    open: ctx.openSection === sectionKey,
    busy: ctx.busySection === sectionKey,
    toggle: () => ctx.setOpenSection(ctx.openSection === sectionKey ? null : sectionKey),
  }
}

/** The inline Word-style comment box, rendered by DocSection when open. */
export function SectionCommentBox({ sectionKey }: { sectionKey: string }) {
  const ctx = useContext(Ctx)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setText(ctx?.sectionComments[sectionKey] ?? '')
  }, [ctx?.sectionComments, sectionKey])
  if (!ctx) return null
  const busy = ctx.busySection === sectionKey || saving

  return (
    <div className="mb-3 rounded-lg border border-[color:var(--doc-border,#d1d5db)] bg-gray-50 p-3 print:hidden">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Comentario para esta sección (ej. 'muy larga', 'usa mis palabras de la semana')"
        className="w-full rounded-md border border-[color:var(--doc-border,#d1d5db)] bg-white px-2 py-1.5 text-[0.8125em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {error && <p className="mt-1 text-[0.75em] text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={async () => {
            setSaving(true)
            setError('')
            try {
              await ctx.saveSection(sectionKey, text.trim())
            } catch {
              setError('No se pudo guardar')
            } finally {
              setSaving(false)
            }
          }}
          className="flex cursor-pointer items-center gap-1 rounded-md border border-[color:var(--doc-border,#d1d5db)] px-3 py-1.5 text-[0.75em] font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check size={12} /> Comentar
        </button>
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={async () => {
            setError('')
            try {
              await ctx.regenerateSection(sectionKey, text.trim())
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo regenerar')
            }
          }}
          className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.75em] font-medium text-white transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ctx.busySection === sectionKey ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Regenerar con este comentario
        </button>
      </div>
    </div>
  )
}

/** Global rating row — one discreet line after the last section. */
export function PlanFeedbackFooter() {
  const ctx = useContext(Ctx)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    setComment(ctx?.globalComment ?? '')
  }, [ctx?.globalComment])
  if (!ctx) return null
  const current = ctx.rating ?? 0

  return (
    <div className="mt-8 border-t border-[color:var(--doc-border,#d1d5db)] pt-4 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[0.8125em] text-gray-500">¿Qué tal esta planeación?</span>
        <div className="flex" role="radiogroup" aria-label="Calificación de la planeación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={current === n}
              aria-label={`${n} de 5 estrellas`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={async () => {
                setExpanded(true)
                setSaved(false)
                try {
                  await ctx.saveGlobal(n, comment)
                  setSaved(true)
                } catch {
                  /* keep UI state; she can retry */
                }
              }}
              className="cursor-pointer p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Star
                size={20}
                className={
                  (hover || current) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                }
              />
            </button>
          ))}
        </div>
        {saved && <span className="text-[0.75em] text-gray-400">Guardado</span>}
      </div>
      {expanded && (
        <div className="mt-2 flex max-w-xl gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            placeholder="¿Algo que mejorar para la próxima? (opcional)"
            className="flex-1 rounded-md border border-[color:var(--doc-border,#d1d5db)] bg-white px-2 py-1.5 text-[0.8125em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            disabled={!current}
            onClick={async () => {
              setSaved(false)
              try {
                await ctx.saveGlobal(current, comment)
                setSaved(true)
              } catch {
                /* retryable */
              }
            }}
            className="cursor-pointer rounded-md border border-[color:var(--doc-border,#d1d5db)] px-3 py-1.5 text-[0.75em] font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire `DocSection` (`components/planner/PlanDocumentViewer.tsx` ~line 106)**

Add imports at the top of the file:

```typescript
import {
  PlanFeedbackProvider,
  PlanFeedbackFooter,
  SectionCommentBox,
  useSectionFeedback,
} from '@/components/planner/PlanFeedback'
```

Add `feedbackKey` to DocSection's props and render the icon + box. In the props type add `feedbackKey?: string`; in the destructuring add `feedbackKey`. Then inside the component, before `return`:

```typescript
const fb = useSectionFeedback(feedbackKey)
```

In the header row (the `div` holding the title + Editar button), add BEFORE the Editar button (so Editar stays right-most):

```tsx
{
  fb && (
    <button
      type="button"
      onClick={fb.toggle}
      aria-label={fb.comment ? 'Ver comentario de la sección' : 'Comentar esta sección'}
      className="relative flex items-center gap-1 text-[0.75em] text-primary hover:underline print:hidden py-1 px-2 -my-1 rounded hover:bg-primary/5 cursor-pointer"
    >
      <MessageSquare size={12} />
      {fb.comment && (
        <span
          className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary"
          aria-hidden
        />
      )}
    </button>
  )
}
```

(`MessageSquare` is already exported by lucide-react; add it to this file's lucide import.)

After the header `div` closes and before the `{editing ? … : children}` block, render the box:

```tsx
{
  fb?.open && feedbackKey && <SectionCommentBox sectionKey={feedbackKey} />
}
```

- [ ] **Step 3: Pass `feedbackKey` at the call sites**

In `QuincenaSections`'s `renderKey` switch, every narrative case that already passes `editValue`/`onSave` gains `feedbackKey={key}`: `actividades_iniciales`, `actividades_rutina`, `aventura_lectora`, `estrategia_comunitaria`, `pausas_activas`, `ajustes_razonables`, `ejes_articuladores`. The `proyecto` case gains `feedbackKey="proyecto"`. Example (the pattern, applied to each):

```tsx
      case 'actividades_iniciales':
        return pd.actividades_iniciales ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.actividades_iniciales}
            onSave={(v) => handleEdit(key, v)}
            feedbackKey={key}
          >
```

In the taller branch (non-quincena JSX around line 1120), the `ajustes_razonables`, `desarrollo_taller`, `actividades_iniciales`, `actividades_rutina`, `aventura_lectora` and `pausas_activas` DocSections gain the same prop with their literal key, e.g. `feedbackKey="desarrollo_taller"`.

- [ ] **Step 4: Provider + footer in `PlanDocumentViewer`**

In the `PlanDocumentViewer` component's return, wrap the document content (the outer `<div>` that contains the header + sections) with the provider, and render the footer after the last section content (after the quincena/taller branch, before sub-plans is fine — spec says "after the last section"; place it after the sub-plans block so it's truly at the document's end):

```tsx
<PlanFeedbackProvider fortnightId={fortnightId} onReload={onReload}>
  {/* existing document JSX unchanged */}
  …
  <PlanFeedbackFooter />
</PlanFeedbackProvider>
```

(`onReload` already exists as a prop — the same callback `handleEdit` uses.)

- [ ] **Step 5: Verify no design change + typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.
Manual check: `npm run dev`, open a plan → document looks identical; hovering a section shows the small comment icon next to Editar; stars row sits under the last block; print preview (Cmd+P) shows NO feedback UI.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all tests pass (207 existing + new from Tasks 2–4).

- [ ] **Step 7: Commit**

```bash
git add components/planner/PlanFeedback.tsx components/planner/PlanDocumentViewer.tsx
git commit -m "feat(feedback): stars + Word-style section comments in the plan viewer"
```

---

### Task 6: Acceptance + docs + ship

**Files:**

- Modify: `docs/PROGRESS.md`

**Interfaces:** none — verification and bookkeeping.

- [ ] **Step 1: Full acceptance run**

Run: `git diff --stat HEAD~5` (review every file listed) then `npm run typecheck && npm run lint && npx vitest run && npm run build`
Expected: all clean/green.

- [ ] **Step 2: Manual end-to-end (dev server)**

1. Open an existing planeación → rate it 3 stars + comment "quiero más actividades con material concreto" → reload → stars persist.
2. Comment the `proyecto` section "hazlo más corto" → **Regenerar con este comentario** → section rewrites, bullets/momentos formatting intact.
3. Confirm a `plan_corrections` row and two `plan_feedback` rows exist (SQL editor).
4. Generate a new plan → its `<preferencias_aprendidas>` distillation will include the feedback on the next stale refresh (source_count increases).

- [ ] **Step 3: Update PROGRESS.md**

In "What exists", extend the Lesson Planner bullet with: `feedback loop (rating 1-5 + comentarios por sección estilo Word + regenerar sección con el comentario; alimenta el perfil aprendido — migration 070)`. Update the test count line to the new totals from Step 1.

- [ ] **Step 4: Commit + push**

```bash
git add docs/PROGRESS.md
git commit -m "docs: plan feedback loop shipped (migration 070)"
git push origin main
```

---

## Self-Review

- **Spec coverage:** §1 table → Task 1. §2 global UI → Task 5 (footer); §2 section comments → Task 5 (DocSection + box). §3 feedback API → Task 2; §3 regenerate → Task 3 (incl. `plan_corrections` logging + normalization). §4 learning → Task 4. §5 measurement = data only, no task needed (rating stored by Task 2). Out-of-scope items have no tasks. ✓
- **Placeholders:** none — all steps carry real code/commands. ✓
- **Type consistency:** `FeedbackRow` defined once (Task 2), imported in Task 4; `feedbackConflictTarget` used in Tasks 2 and 3 with the same signature; `feedbackKey` prop name consistent across Task 5 steps; route contracts match the UI's fetch bodies. ✓
