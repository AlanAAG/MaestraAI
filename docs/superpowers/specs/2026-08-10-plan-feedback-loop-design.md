# Plan Feedback Loop — Design

**Date:** 2026-08-10 · **Status:** approved by Alan
**Goal:** the platform learns to generate better planeaciones from explicit teacher feedback, with zero visible change to the current document design.

## Context

The app already learns implicitly: `plan_corrections` (per-section edit diffs) are distilled by `lib/planner/learning.ts` into `<preferencias_aprendidas>` injected at generation. This feature adds the **explicit** signal — a global rating + Word-style section comments — and makes each section comment immediately actionable ("Regenerar con este comentario"). No custom model is trained; this is the machine that collects the dataset a future fine-tune would need.

## 1. Data — migration 070

One table, `plan_feedback`:

| column       | type                       | notes                                                    |
| ------------ | -------------------------- | -------------------------------------------------------- |
| id           | uuid pk                    |                                                          |
| teacher_id   | uuid → teachers, cascade   |                                                          |
| fortnight_id | uuid → fortnights, cascade |                                                          |
| section_key  | text null                  | null = global feedback; else a plan_document section key |
| rating       | int null, check 1–5        | global rows only; null on section comments               |
| comment      | text null                  | ≤ 2000 chars                                             |
| embedding    | vector(1536) null          | unused today; drop-in for future retrieval (approach B)  |
| created_at   | timestamptz default now()  |                                                          |

Constraint: a row must have `rating` or `comment`. RLS: `FOR ALL` scoped to the owning teacher (same pattern as `plan_corrections`). One global row per (fortnight, teacher) — upsert on re-rate. Section comments: latest per section wins (upsert on fortnight+section).

## 2. UI — `PlanDocumentViewer`, invisible until used

Existing design untouched: same fonts, colors, spacing, section headers. Everything `print:hidden` and excluded from DOCX/PDF.

- **Global**: one discreet row after the last section — "¿Qué tal esta planeación?" + 5 Lucide `Star` buttons (existing icon sizing, `text-primary` when active, ≥44px touch targets). Picking a star reveals an optional comment textarea + save. Shows the saved state on reload.
- **Section comments (Word-style)**: a `MessageSquare` icon button next to each section's existing "Editar" button, same styling (`text-[0.75em] text-primary`, hover underline). Click toggles a small inline box under the header: textarea + **Comentar** (save only) + **Regenerar con este comentario** (save + regenerate that section now, with the existing loading spinner pattern). Sections with a saved comment show a small dot on the icon. Closed = zero pixels.

Accessibility: `aria-label` on icon buttons, `aria-pressed` on stars, visible focus rings, color never the only indicator (dot + tooltip text).

## 3. API

- `POST /api/planner/feedback` — Zod: `{ fortnight_id, section_key?, rating?, comment? }`, ownership check via teacher, upsert as per §1. `GET ?fortnight_id=` returns the teacher's feedback for prefill.
- `POST /api/planner/regenerate-section` — Zod: `{ fortnight_id, section_key, comment }`. Loads the plan, builds a focused prompt (current section text + the comment + teacher voice/`<preferencias_aprendidas>` + relevant grounding for that section), calls `callPlannerModel`, runs the existing normalization (`sectionToString`, `bulletizeMomentos`, `enforceCamposFormativos` when the section is campos), saves only that field via the same path `update-document` uses, and logs a `plan_corrections` row (original → regenerated) so the implicit loop also sees it. Rate-limited like generate-document.

## 4. Learning

`buildDistillUserPrompt` gains a third input: recent `plan_feedback` rows (ratings + comments, capped like corrections). The distiller prompt treats low-rated plans' comments as high-priority preferences. No scheduling change — `refreshLearnedProfileIfStale` already runs before each generation.

## 5. Measurement (no dashboard — YAGNI)

Success signal lives in the data: average rating trend across plans + regenerations-per-plan. Queried ad hoc via SQL. A metrics UI is out of scope until asked for.

## Out of scope

Fine-tuning a model (needs hundreds of edit pairs; this feature collects them), embedding-based feedback retrieval (column reserved), metrics dashboard, parent/student feedback.

## Testing

- Unit: feedback upsert semantics (one global row per plan; latest section comment wins), distill prompt includes feedback, regenerate-section normalization path.
- Existing suites must stay green (207 tests).
- Manual: rate a plan, comment a section, regenerate it, confirm next generation's `<preferencias_aprendidas>` reflects the comment.
