MaestraAI — Project Progress
Claude: update this file after every coding session before ending. Add what was built, what changed, and what's next. Keep it accurate — this is the single source of truth for project state.

Current phase: Phase 6 — Quality & Polish (output quality, design, games, branding)

---

## What exists (current state)

### Infrastructure

- Next.js 14 App Router + Tailwind v3 + shadcn/ui + Inter font
- Supabase: ~26 tables, RLS on all tables, AES-256-GCM encryption on PII
- Security: rate limiting (Upstash Redis), CSRF, CSP headers, audit logging, file validation
- Dev tooling: Vitest (23 passing tests), Prettier, Husky, typecheck script, CI via .github/workflows/ci.yml
- Deployment: Vercel, auto-deploy on push to main

### Auth & Onboarding

- Email/password + Google OAuth
- 7-step onboarding wizard (name → grade → editorial → school → group → API key → confirm)
- Consent records, account soft-delete with 30-day cron hard-delete

### Dashboard

- Motivational phrase card (30 phrases, rotates on refresh via localStorage counter)
- LMS sync status card (gated on editorial has_lms_sync)
- Mobile bottom nav with "Más" sheet for overflow items

### Lesson Planner (`/planeaciones`)

- Document-style plans: Quincena + Taller formats
- claude-sonnet-4-6 PRIMARY (depth/voice) / gpt-4o-mini fallback via `lib/planner/model.ts` (`callPlannerModel`, max_tokens 16k); removed the 2,500-word cap, prompts now demand exhaustive multi-page output with verbatim NEM PDAs
- Full bundle on first generate: main Proyecto + auto-generated rich Letter&Number + Números sub-plans (parallel pipeline in generate-document, shared `lib/planner/subplan.ts`); teacher template's activity_blocks/block_descriptions now injected (previously discarded)
- Teacher voice fidelity: "VOZ DE LA MAESTRA" few-shot injection from uploaded template
- Per-group schedule: letter_number_day + numeros_day from groups.fixed_weekly_schedule (no hardcoding)
- Sub-plans: on-demand Letter & Number / Numeros generation (claude-haiku-4-5)
- Document-style preview: PlanDocumentViewer renders a paper "sheet" (header with fechas/grupo/profesora, flowing always-visible sections in the teacher's order, Word-style tables, inline sub-plans, print CSS) — replaces the old collapsed accordions
- Inline section editing (PATCH /api/planner/update-document)
- DOCX export
- ObservationCalendar per group
- Up to 5 plan templates per teacher (DOCX / PDF / image via Claude Vision)
- NEM/PRONI official alignment: 4 Campos Formativos, 7 Ejes Articuladores, SEP 2024 citations
- PRONI markers for Kinder 3 groups

### Materials & Games

- Generation: flashcards, worksheets, memory game (memorama), bingo, word search, matching, sorting, picture-word-match, YouTube songs
- All material types: shareable via play token -> /jugar/[token] (public, no-auth)
- Projectable flashcard viewer (/materiales/[id]/proyectar): large text, auto-advance, keyboard nav
- Memory Match: card flip animations, images, audio
- Bingo: seeded LCG, up to 35 unique cards, PDF export
- Word Search: tap-to-select, speaks found words
- Sorting Game: tap-to-sort into category bins
- Picture-Word Match + Listen and Tap: image + audio-first, no reading required
- Autonomous generation (FortnightPackProgress): SSE -> sequential generate-all per day, DB-resumable

### Richmond Integration

- Chrome Extension (Manifest V3): auto-sync scores from richmondlp.com
- CSV/XLSX import with fuzzy student matching (Levenshtein)
- Analytics dashboard: 4 views (todos / por-grupo / por-tarea / por-alumno), score distribution chart
- Richmond unit linkage in lesson plans (injects unit context into prompt)
- Calificaciones tracker (`/calificaciones-richmond`): consolidated sort dropdown (Apellido/Nombre/Pendientes/Entregados primero) + segmented view toggle; always-visible smooth SVG area trend (% entregas over time, fits width, no horizontal scroll); student names title-cased on display
- Parent notifications: editable account-level email template (`teachers.parent_email_template`, placeholders `{padre}/{alumno}/{tareas}`), per-task one-click, per-student individual send, and bulk "Avisar a todos" digest (one email per parent listing their child's pending tasks). Shared render/decrypt helper in `lib/calificaciones/notify.ts`. Note: Richmond sync has no per-homework "unit" field — only task title.

### Student & School

- Student progress: bar charts, timeline, CSV export
- Parent contacts: AI extraction (Claude Haiku) from text or photo, email notifications via Resend
- School network: announcements feed, shared resources hub, team management (admin/coordinator roles)
- WhatsApp links for parent contact (decrypted via service role)

### Vocabulary

- 3-mode input: manual, bulk text paste, image upload (Claude Vision)
- Inline edit (teacher-owned words only)
- Usage count badges per word ("En N planes" / "Sin usar")
- 129 system vocabulary words seeded

### Diary (`/diario`)

- 5-step wizard -> streaming AI summary -> auto-save on completion
- PDF download, 7-day share link (/compartir/[token])
- List view with delete

### Legal & Compliance

- Aviso de Privacidad (15 sections, LFPDPPP / SABG 2025)
- Terminos de Servicio (13 sections, Mexican jurisdiction)
- Disaggregated consent on register + onboarding
- Student name redaction in diary summaries

---

## Pending assets / input needed from Alan

These block completing the landing page redesign — everything else is built:

| Asset                             | Where it's used                                             | Notes                                                                        |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Character illustration**        | Hero right side, timeline avatar, fixed bottom-right corner | PNG/SVG transparent bg. ~220px for hero, 48px circular for timeline + corner |
| **Character expression variants** | 1 per timeline stop (optional)                              | Pointing / explaining / celebrating — swap per feature section               |
| **Logo / wordmark SVG**           | Nav, footer                                                 | Replaces plain "MaestraAI" text                                              |
| **Teacher photo**                 | Testimonial avatar                                          | Alejandra M., Kinder 3 CDMX                                                  |
| **Additional testimonials**       | Testimonial section                                         | 2–3 more quotes with name + school + grade                                   |
| **Partner school logos**          | Trust bar (optional)                                        | Adds credibility strip below hero                                            |
| **Hero background art**           | Behind hero text (optional)                                 | Classroom or Mexico-themed illustration                                      |

---

## What does NOT exist yet

- **Report cards generator** — trimestral qualitative reports for parents (post-launch)
- **Admin dashboard** — school-admin-specific analytics and management views
- **Game difficulty levels** — small/medium/large card set modes (deferred; needs a UX decision + UI)
- **Word Scramble / Simon Says** — additional game types
- _(Game audio feedback now EXISTS — Web Audio SFX + confetti, see "Games quality — Phase 2")_

---

## Current focus — Phase 6: Quality & Polish

1. **Planeaciones output quality** — improve prompt fidelity, structure, NEM depth, day-by-day coherence
2. **Landing page design** — conversion-focused, Awwwards-level EdTech aesthetic
3. **Dashboard & overall app design** — typography, spacing, color consistency, mobile polish
4. **Games quality** — audio feedback, smoother animations, better UX on tablets/projectors
5. **Branding** — logo, color system, consistent visual identity across app + landing

---

## Games quality — Phase 1 (visuals + accuracy)

- **Emoji visuals** (fixes the #1 problem: Unsplash first-result-wins returned wrong/photographic images, and image-games degraded to text). New `lib/materials/emoji.ts` `wordToEmoji` (curated ~260-word preschool map + normalization) and `components/games/VocabVisual.tsx` (resolution: stored `emoji` → curated map → Unsplash image → text). AI builders (flashcards, games/memorama, matching, picture-word-match, sorting) now also emit a sense-correct `emoji`. Players render emoji-first: MemoryMatch, PictureWordMatch, ListenAndTap, SortingGame, FlashcardProjector. ListenAndTap no longer requires images (was showing empty). Unsplash plumbing kept as the seam for a future real/gen-AI image source.
- **Correctness**: shared `lib/materials/ai-json.ts` `extractJson` adopted across builders (was duplicated regex); memorama enforces the 6-pair cap + dedups + normalizes id; sorting validates every word lands in a real category (+5-color palette); **bingo guards `< required` words** so a card never repeats a word (3×3 had no guard); **kinder word-search rewritten** — content-based seed (was near-static), horizontal+vertical placement (was horizontal-only top-aligned), 10×10, up to 10 words.
- **Polish**: WordSearch cells responsive ≥44px (were 36px, under tablet min) + larger letters; "Memory Match" → "Memorama"; public `/jugar/[token]` widened `max-w-lg` → `max-w-3xl` for projectors.
- Tested: `lib/materials/emoji.test.ts`, `lib/materials/games-correctness.test.ts` (bingo no-repeat + guard, word-search fill + seed variance). No migration.

## Games quality — Phase 2 (feel: audio + celebration)

- **Sound effects** (`hooks/useSound.ts`): generated via the Web Audio API — correct (rising ding), wrong (soft low buzz), win (major arpeggio). Zero audio assets, zero audio dependency. Wired into PictureWordMatch, ListenAndTap, SortingGame, WordSearchGame, MemoryMatch (+ StudentBingoCard win). Return is memoized for stable effect deps.
- **Confetti** (`lib/ui/celebrate.ts`, `canvas-confetti`): kid-friendly burst on every game win.
- **TTS improved** (`hooks/useSpeech.ts`): natural-voice selection (`getVoices` + `voiceschanged`, prefers Google/Microsoft/local matching the lang), and a microtask gap on `cancel()→speak()` to fix browser flakiness.
- **Filled the audio gaps**: MemoryMatch now pronounces the word on a match (had no audio); BingoCallerMode now speaks each called word (the obvious gap for a caller mode).

## Games quality — Phase 3 (functionality)

- **Word-search drag-select**: replaced the confusing tap-endpoint-A / tap-endpoint-B model with **pointer drag** (mouse or finger) across letters, with a **live highlight** of the selected line and match-on-release. Touch works via `elementFromPoint` hit-testing (`touch-none` on the grid). Supports the new horizontal+vertical layouts.
- **Dedup**: removed the inline `seededShuffle` copies in `StudentBingoCard` + `BingoCallerMode` → shared `lib/utils/shuffle`.
- **Memorama difficulty levels**: `MaterialGenerator` shows a size selector (Pequeño 4 / Mediano 6 / Grande 8 pares) when memorama is selected → sends `options.memory_pairs` → generate route passes it to `buildGameContent(maxPairs)` (caps the generated pairs, 3–10). The standalone `materiales` inline creator still defaults to 6.
- **Shell consolidation**: extracted shared `components/games/GameProgress.tsx` (the step counter/bar, was copy-pasted in 3 games) and `GameComplete.tsx` (the win screen, was ~5 copies including GameShell). No behavior change. Left MemoryMatch's Trophy overlay + Bingo's banner as bespoke game-specific celebrations.
- **Deferred** (own pass): real/gen-AI image source — held off pending a provider decision (~$1–2 one-time for cheap gen-AI + per-word cache, ~$0/game after; or free photo API). The `imageMap`/`VocabVisual` seams are ready; swapping is one function (`lib/images.ts`).

## Batch 1 — breaking bugs + LFPDPPP (current)

- **Materials/games 400 fixed**: the document-view `MaterialGenerator` now forwards `fortnights.vocabulary` (was sending the empty `vocabulary_items` bank → "Provide lesson_plan_id or vocabulary[]"). `bingo` + `word-search` routes also fall back to `fortnights.vocabulary` and accept a `vocabulary` override; `materials/generate` letter_recognition guarded against null lessonPlan.
- **Vocabulary save fixed**: LLM-extracted items are now clamped (`clampVocabItems` in `lib/vocabulary/parse.ts`) — bad color → `blue`, multi/accented letter → first A-Z or drop, word → ≤50 chars — so one odd value no longer Zod-rejects the whole batch. "0 nuevas" now shows "Ya estaban guardadas" instead of reading as failure. Tested.
- **LFPDPPP — NEE names anonymized**: `generate-document` no longer decrypts NEE student names; injects positional labels (`Alumno A/B…`) into `ajustes_razonables`. Prompt rules (quincena + taller) updated to forbid real names. `plan_document` RLS already owner-only.
- **LFPDPPP — uploaded examples**: `EXTRACTION_SYSTEM` instructs the model to replace student names with "Alumno"; the raw-text fallback runs `scrubNames` (best-effort regex). Tested.

## NEM grounding caching (current)

- **Distilled synthesis** (`lib/nem/synthesis.ts` `NEM_SYNTHESIS`, mirrored in `context/NEM_SYNTHESIS.md`): always-on rules — 7 ejes (full defs), perfil de egreso (I–X), 4 campos, evaluación rules, PRONI, privacidad.
- **Prompt caching** (`callPlannerModel` `cachePrefix`): the grounding (`NEM_SYNTHESIS` + full verbatim PDA bank) is now a **cached ephemeral system block** instead of riding in the user message of every call. The main-doc call writes the cache; the sub-plan calls read it (~90% cheaper) — was ~28k duplicated grounding tokens/generation, now ~0 after the first call. Removed the per-call grounding + the campo-scoping (prefix is byte-identical → cache hits).
- **Deduped** the NEM rule blocks out of `QUINCENA_SYSTEM`/`TALLER_SYSTEM` (the synthesis owns them; also fixed a stale ejes list there).
- **Slimmed `context/`**: deleted `La_Nueva_Escuela_Mexicana.md` (superseded by Plan 2022) and `LFPDPPP.md` (reduced to the `<privacidad>` rule). No runtime refs.
- **Teacher's-own-planeaciones RAG — BUILT** (`lib/planner/embeddings.ts`, migration `054`): each generated plan's voice-bearing text is embedded (OpenAI `text-embedding-3-small`, 1536d) into `planeacion_embeddings` (pgvector, RLS owner-only). On a new generation, the project topic is embedded → `match_planeaciones` RPC returns the teacher's 3 most-similar past plans → injected FIRST in the user prompt as `<ejemplos_estilo_maestra>` so the model writes in her real voice. Fully best-effort: no `OPENAI_API_KEY` / migration 054 not pushed / no prior plans → empty block, generation unaffected. Tested (pure helpers). **Requires pushing migration 054** (enables `vector` extension) to switch on.
- Tested (`lib/nem/synthesis.test.ts`). No migration.

## Batch 2 — official NEM grounding (current)

- **Verbatim Contenido+PDA bank**: `scripts/parse-contenidos.mjs` parses `context/Programa_sintetico_fase_2.md` → `lib/nem/contenidos-fase2.ts` (34 contenidos, 9/9/8/8, Tercer-grado PDAs verbatim). Re-run the script if the source changes.
- **Grounding injection** (`lib/nem/grounding.ts` `nemGroundingBlock`): prepended to quincena + taller prompts and (campo-scoped) to sub-plan + custom-sub-plan prompts. Contains `<contenidos_oficiales>` (REPRODUCE VERBATIM, prohibido inventar), `<ejes_articuladores>` (canonical 7), `<evaluacion_formativa>` (cualitativa, instrumentos), and `<proni_contenidos>` (6 official areas + PDAs, only Kinder 3).
- **Fixed wrong data in `lib/nem-official-data.ts`**: ejes → canonical names (Interculturalidad crítica, Apropiación de las culturas…, Artes y experiencias estéticas); PRONI areas → the 6 official Spanish contenidos. Removed the invented inline PRONI list from the prompt.
- Tested (`lib/nem/grounding.test.ts`: 34 contenidos, verbatim PDA present, PRONI gated on Kinder 3, campo scoping).

## Batch 3 — sub_planes mirrors the teacher's example (current)

- **Sub-plan inventory capture**: `extract-template` now extracts `subplan_inventory` (metodología + nombre + secciones per sub-plan in the uploaded example) into `TeacherProfile`. Injected into the main prompt as `<estructura_subplaneaciones>` so the plan reflects the same set.
- **Auto-generate the example's extras**: `generate-document` generates the non-standard sub-plans the example contains (Taller, ABJ…) via `generateCustomSubplan` (best-effort, capped at 3, `allSettled`, non-fatal) — beyond the standard Proyecto + Letter&Number + Números. Teacher-added custom sub-plans still survive regeneration.
- **`aventura_lectora`** is now a distinct field (separated from `actividades_rutina`): prompt schema + viewer DocSection + inline edit whitelist + DOCX export.
- **`observaciones`** now also renders in the **DOCX export** (was on-screen only).
- Deferred: structured `libros_richmond` array (the prompt already requests Richmond books inline with page ranges).

## Recent fixes (UX + branding batch)

- Brand corrected **MaestraAI → MaestraIA** everywhere user-facing (app shell, metadata/title, dashboard, auth, landing, legal, share pages, generated-plan material list, parent-email sender, PDF title).
- Dashboard: "Boletas" card → **Calificaciones** (→ /calificaciones-richmond); **Mi Escuela** title shows the school name; "período de inglés" → "duración de tu clase/periodo".
- Richmond: extension ingest now writes `richmond_sync_log` so the dashboard's "Última sincronización" reflects extension syncs; **"Ir a Richmond"** button on the calificaciones page.
- Calificaciones: trend chart now has **hover (guide line + dot + tooltip) and x-axis date labels**; **view-specific sort** (por-tarea: fecha/alfabético/%entregados; por-alumno: nombre/pendientes), each hidden in the other view.
- Mi Diario: whole card clickable + **share-with-school** button.
- Vocabulary: deterministic **letter-grouped paste parser** (`lib/vocabulary/parse.ts`, tested) — the A/words/B/words paste works without the LLM; upload now accepts **PDF/DOCX** (text + OCR via mammoth/Claude); raised LLM token budget.
- Planeación: **"Crear materiales y juegos"** surfaced from the document view (fortnight-level; `MaterialGenerator.lessonPlanId` now optional; its from-YouTube option covers video→material/game); **orientation toggle** (vertical/horizontal) wired into DOCX + PDF export.
- Platform: reusable **`<DownloadMenu>`** (PDF / Word / Copiar enlace) on planeaciones + diario detail.
- **Planeación PDF export fixed**: the old `/api/planner/pdf` route renders the abandoned day-by-day `lesson_plans` model and was hidden for document-style plans (Word-only). Document-style plans now get a **"PDF (imprimir)"** option that `window.print()`s the on-screen document — so the PDF matches the live design (font/size/accent), logo, and full `plan_document` with zero divergence. Global `@media print` block in `globals.css` hides app chrome (aside/nav/footer) + the page header; the sheet already had print styles. Legacy lesson-plan plans keep the old route.
- Mi Perfil: **personalization** fields (materia, estilo de enseñanza, notas para la IA) — migration 049, resilient `/api/teachers/me` GET/PATCH.
- Planeación generation: **voice merge** — examples merged across all same-type templates for richer few-shot.
- **Deferred** (need a migration that would break plan creation until pushed): per-GRADE plan selector + obs-calendar group toggle; formats dropdown with "Diseño de sistema" + fixing the ignored template selection. Also pending: multi-format DOCX exporters for diario/materials surfaces.

## Generation quality v2 (extraction + few-shot + eval format)

- **Rich template extraction** (`lib/planner/extract-template.ts` → `TeacherProfile` in `types/teacher-profile.ts`): captures verbatim `writing_style_samples` (≥250 chars), a `pda_bank` (verbatim NEM PDAs), `evaluation_columns`, section examples, `verb_person`, `school_specifics`. max_tokens 1000→2500, docx text slice 6k→16k. Legacy fields kept for backward compat.
- **Attention-ordered prompt** (`generate-document/route.ts` `profileContext`): teacher voice → PDA bank → eval format → section examples → structure, injected BEFORE the output schema (was appended last). PDA bank + eval columns also passed into sub-plan generation (`lib/planner/subplan.ts`).
- **Configurable evaluation columns**: detected from the upload (e.g. Sí/No/Proceso), stored on `plan_document.evaluation_columns`, honored by the viewer `EvaluacionGrid` + DOCX `evaluacionTable` (default Logrado/En proceso/Requiere apoyo).
- **`callPlannerModel`**: assistant **prefill `{`** (forces clean JSON start) + `stop_reason==='max_tokens'` truncation logging.
- Voice + PDA bank now **merged across all same-type formats**.
- Note: output schema kept renderer-compatible (Proyecto stays a top-level field, not `sub_planes[0]`) to avoid breaking PlanDocumentViewer/export — the full sub_plan restructure would need coordinated viewer/export changes.

## Deployment

- Vercel auto-deploys on push to main
- All migrations applied through 042; **044 + 045 + 046 + 047 + 048 + 049 pending push by Alan** (Docker unavailable locally). 049 = add `teachers.teaching_style` + `teachers.profile_notes` (Mi Perfil personalization; GET/PATCH degrade gracefully until pushed). 048 = add `teachers.parent_email_template jsonb` (parent-email template editor; until pushed, notifications still send using the built-in default template). 046 = drop dead students.special_needs_encrypted; 047 = drop students.display_name (names now encrypted-only). After pushing, regen types: `supabase gen types typescript --linked > lib/database.types.ts`
- After pushing migrations: run `supabase gen types typescript --linked > lib/database.types.ts` (it is stale — missing fortnight_packs, richmond_interactive_content, parent_contacts, teacher_plan_templates + several columns), and hit `/api/cron/backfill-diary` once with the CRON_SECRET bearer to encrypt pre-existing diary rows
- `NEXT_PUBLIC_SUPPORT_EMAIL` — optional, defaults to soporte@maestraia.com on verify-email page
- Upstash Redis, CSRF_SECRET, RESEND_API_KEY, ENCRYPTION_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY set in Vercel env
- Production domain: maestraia.com / maestraai.mx

---
