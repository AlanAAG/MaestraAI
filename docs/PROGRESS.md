MaestraAI — Project Progress
Claude: update this file after every coding session before ending. Add what was built, what changed, and what's next. Keep it accurate — this is the single source of truth for project state.

Current phase: Phase 6 — Quality & Polish (output quality, design, games, branding)

---

## What exists (current state)

### Infrastructure

- Next.js 14 App Router + Tailwind v3 + shadcn/ui + Inter font
- Supabase: ~26 tables, RLS on all tables, AES-256-GCM encryption on PII
- Security: rate limiting (Upstash Redis), CSRF, CSP headers, audit logging, file validation
- Dev tooling: Vitest (88 passing tests), Prettier, Husky, typecheck script, CI via .github/workflows/ci.yml
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
- **Richmond Unit Overview (book catalog)** — read-only seeded tables `richmond_units` + `richmond_lesson_groups` (migration `056`, public-read RLS; seed `supabase/seed/richmond_tg5a.ts` scaffolds TG5A 8 units × 4 lesson groups, empty content arrays). Teachers (Kinder 3 / PRONI only) pick a unit + lesson groups in the planeación form via `components/richmond/UnitSelector.tsx`; the vocabulary section splits into "📚 Vocabulario Richmond" (read-only, resolved from DB) + "✏️ Vocabulario de la maestra" (`VocabularySections.tsx`). Selection saved on `fortnights.richmond_unit_id` + `richmond_lesson_group_ids` (best-effort). At generation, `resolveSelectedContent` merges/dedupes the selected groups → `<proni_unit>` block (`lib/prompts/blocks/richmond-block.ts`) injected into quincena + taller prompts + sub-plans, with a `buildGameVocabularyHint` reinforcing English-game vocab; the `<proni_regla>` in NEM_SYNTHESIS forbids inventing vocab outside the list. Lib: `lib/richmond/{types,queries}.ts`. Tested (merge/dedupe, block null+valid, UnitSelector reset, vocab sections render). **Requires pushing migration 056 + running the seed.**
- **Real TG5A content loaded**: source markdown in `richmond_units/unit_0*.md` (8 units, per-group Early Learning Goals / Vocabulary / Language Models) → `scripts/parse-richmond-units.mjs` parses them → **migration `057_richmond_tg5a_content.sql`** (idempotent upserts: 8 unit titles + 32 lesson groups with real vocab/goals/models). Re-run the script if the .md sources change. The seed env-loader (`supabase/seed/richmond_tg5a.ts`) now reads `.env.local` itself (CRLF-safe). **Applied (057 pushed).**
- **Richmond vocabulary auto-seeded** — migration `058` adds `teachers.richmond_vocab_seeded_at timestamptz`. On first vocabulary page load, Richmond teachers get all TG5A words bulk-inserted into their `vocabulary_items` (idempotent, ON CONFLICT DO NOTHING). They can delete individual words; deleted words stay gone (seeding is one-time per teacher). **Requires pushing migration 058.**
- **Dashboard "not configured" banner fixed** — the amber banner on `/dashboard/richmond` now uses `overview.length === 0` (no synced assignment data) as the "not configured" signal instead of `richmond_group_name` (which the extension doesn't always populate). If data has been synced, the banner is hidden.
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

## Self-improving planeaciones — learning loop (current)

The compounding system on top of the RAG: **generate → she edits → corrections logged + plan re-embedded → distilled "learned profile" refreshes → next generations use her corrected plans + learned preferences.** Migration `055` (RLS owner-only). All best-effort/graceful.

- **Learn from edits** (`update-document`): on each inline edit, re-embeds the EDITED doc (RAG now retrieves her corrected text, not stale AI output) AND captures the `original→edited` correction into `plan_corrections` (skips no-ops).
- **Evolving profile** (`lib/planner/learning.ts`, `teacher_learned_profile`): a Haiku distillation reads her recent edited plans + last 20 corrections → refreshed `writing_style_samples` + a short `preferences` note. Auto-refreshes when stale (≥5 new corrections or >14 days), gated so most generations skip it.
- **Injected** in `generate-document`: learned voice samples merged into the profile (→ `<teacher_voice>`); `preferences` injected as `<preferencias_aprendidas>` (the accuracy lever). SSE emits a `meta` event → the `[id]` page shows "✨ aprendió de N planeaciones tuyas".
- **On-demand control**: `/api/planner/learn` (POST) + "Aprender de mis planeaciones" button on the planeaciones list (shown at ≥2 plans).
- **Preferences length capped**: distillation prompt enforces "máximo 200 palabras, priorizando patrones en 3+ planeaciones" + a defensive `MAX_PREFERENCIAS_CHARS = 1400` slice on store, so `<preferencias_aprendidas>` can't drift verbose as corrections accumulate.
- **Backfill** (`/api/planner/backfill-embeddings`, POST, teacher-scoped, idempotent — skips already-embedded): embeds pre-existing plans so retrieval works retroactively. The "Aprender de mis planeaciones" button runs backfill → distill in one click.
- Tested (`lib/planner/learning.test.ts`: staleness gate + distill prompt). **Requires pushing migrations 054 + 055.**
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

## Generation quality v3 — per-section voice + custom sections + dynamic section order (current)

- **Per-section voice extraction**: `EXTRACTION_SYSTEM` now extracts `section_samples: Record<string, string>` — a verbatim excerpt per section (`proyecto`, `actividades_iniciales`, `actividades_rutina`, `estrategia_comunitaria`, `aventura_lectora`, `ajustes_razonables`), labeled by field name. `TeacherProfile` has the new `section_samples` field.
- **Per-section injection** (`profileContext` in `generate-document/route.ts`): `section_samples` are emitted as `<example_section_X>` blocks inside a `<per_section_voice>` wrapper, placed first in the prompt (highest attention). `QUINCENA_SYSTEM` maps each tag to the corresponding JSON field so the model writes each section in the voice it saw for that specific section.
- **Backwards compatible**: `writing_style_samples` (generic) still injected as `<teacher_voice>` fallback for sections without a specific sample, and for older profiles that don't have `section_samples`.
- **Custom sections** (`custom_sections: [{title, content}]`): added to the output schema in `QUINCENA_SYSTEM` + `QUINCENA_OUTPUT_SCHEMA`. When a teacher's `sections` list contains names not covered by the standard fixed fields, `profileContext` emits a `<secciones_personalizadas>` block and the model generates them into `custom_sections`. `PlanDocumentViewer` renders them as editable `DocSection`s. DOCX export also includes them. No migration needed (plan_document is JSONB).
- **Dynamic section order in viewer** (`lib/planner/section-map.ts`, Path B item 1+2): fuzzy mapper (`mapSectionName`) normalizes teacher section names (accent-strip, lower, partial token match) → field keys. `buildSectionMeta(sections)` returns `{sectionOrder, sectionTitles, customSectionNames}`. At generation time, `generate-document` calls `buildSectionMeta(profile.sections)` and embeds `_section_order` + `_section_titles` into `plan_document` before saving. Viewer's `QuincenaSections` component renders in that order using teacher's exact titles; falls back to canonical `DEFAULT_QUINCENA_ORDER` for older/template plans.
- **Teacher's actual section titles**: `_section_titles: Record<string, string>` stored in `plan_document`. Viewer uses teacher's title (e.g. "Momentos Pedagógicos") instead of the hardcoded default ("Del Proyecto").
- **Teacher's `proyecto` sub-structure** (Path B item 3): `buildQuincenaPrompt` looks up the `Proyecto` entry in `subplan_inventory` and injects `<estructura_proyecto>` with the teacher's actual sub-headings (replacing the hardcoded "Punto de Partida / Planeación / A trabajar / Comunicamos / Reflexión").
- **DOCX export `custom_sections`** (Path B item 4): `export-docx/route.ts` renders `custom_sections` after the evaluación block, before sub-plans.
- **`profileContext` returns `{context}`**; `buildSectionMeta` is called once in the POST handler and once inside `profileContext` (for `customSectionNames` only — separated concerns).
- **Edge cases fixed (audit pass)**: `_section_order` array no longer mutated in place (was mutating the prop reference across renders); `custom:NaN` keys guarded with `isNaN` check; accent-stripping regex uses explicit codepoints; alias tokens ordered most-specific-first to avoid false positives (`lectura` → `aventura_lectora` only matches multi-word aliases before bare token); DOCX sub-plan orphaned "Observaciones y ajustes" heading now conditional; `mdToParas` preserves blank-line paragraph breaks and renders `##` headings as bold.
- **`update-document` route now handles `custom_sections`**: added to `EDITABLE_SECTIONS`; value parsed as JSON array (structured field path); re-embed skipped for no-ops and structured saves; value capped at 60k chars.
- **DOCX export now respects `_section_order` + `_section_titles`**: quincena export uses the same dynamic renderer as the viewer — teacher's custom order and titles appear in the Word file. Taller uses the same fixed order as the viewer. Viewer/DOCX divergence eliminated.
- **Tests**: `lib/planner/section-map.test.ts` — 11 tests covering canonical names, accent folding, alias variants, dedup, custom:N slots, DEFAULT_QUINCENA_ORDER completeness. Suite: 88 passing.
- **Vocab bank bug fixed**: `nueva/page.tsx` was reading `d.items` (undefined) instead of `d.vocabulary` from the GET response — teacher's word bank was always empty in the form. Fixed.

## Per-grade planeaciones + vocab-by-letter + UX batch (current)

- **Planeaciones are per-GRADE, inclusive of all groups** (migration `059_fortnights_grade.sql`: adds `fortnights.grade`, backfilled from the group; keeps `group_id` as a representative group for schedule/roster). Form's "Grupo" selector → "Grado" (shows which groups it covers). Generation fans out to ALL groups of the grade — NEE/ajustes razonables span every group; prompt labels by grade + all group names and states inclusivity. Viewer + DOCX header show "Grado: X". **Requires pushing migration 059.**
- **Teacher vocab driven by quincena letters, not hand-picked**: `VocabularySections` section B now shows every one of her words for Letra semana 1 + 2 (read-only), derived in `nueva/page.tsx` (`letterVocab` memo). Tests updated.
- **Richmond vocab shown by unit/lesson** (not seeded into the letter bank): `/vocabulario` reads `richmond_units` + `richmond_lesson_groups` live for Richmond teachers; `seedRichmondVocabulary` removed; GET returns `editorial`. (Migration 058 column now unused — harmless.)
- **Project description renders first** (immediately below the title) in viewer + DOCX.
- **Extension v1.0.2**: badge warns amber when the current group isn't linked (green only if THIS group is) + context-invalidation guards + SW-inactive retry.
- **"Ir a Richmond"** button added to `/dashboard/richmond`.
- Schedule day (Letter & Number / Números) confirmed already configurable per group in Configuración → group editor; "martes/jueves" are only defaults.

## Alejandra feedback — planeaciones quality (Phase 1+2, current)

Source: `assets/alejandra_feedback.md`. Prompt/render-only — **no migrations**. Plan in `~/.claude/plans/theres-a-new-lexical-mountain.md`. Phase 3 (draft chat, modalidades, 4-week) deferred + Alejandra-gated.

- **Aprendizajes now match the topic (her #1 complaint).** Root cause: the prompt FORCED all 4 campos (`prompts/planner-quincena.ts`) → shoehorned an irrelevant "Saberes". Fix: (1) dropped the "los 4 campos obligatorios" rule → "incluye SOLO los campos relevantes al tema, mínimo 1" + a Saberes-must-relate-to-entorno guard; (2) new `lib/nem/select-contenidos.ts` — a cheap Haiku pre-selection (`selectRelevantContenidos`) shortlists the topic-relevant contenidos from the 35-item bank and injects a `<contenidos_sugeridos>` block into the main quincena prompt (best-effort, empty → full-bank fallback). **ponytail: a Haiku shortlist, not embeddings/RAG — 35 items.** The shared `cachePrefix` keeps the FULL bank so the Números sub-plan stays grounded. `per_subplan` campos union left as a marked rare-edge (`// ponytail:`). Tested.
- **Fixed document order (her sequence).** Unified the THREE competing `DEFAULT_QUINCENA_ORDER` arrays (`section-map.ts`, `PlanDocumentViewer.tsx`, `export-docx/route.ts`) to: iniciales → rutina → aventura → estrategia (libres de violencia) → pausas → ajustes → cronograma (+calendario) → ejes → **campos/aprendizajes** → **proyecto LAST** → evaluación. (Reverses the earlier "proyecto/description first" default; `nombre_proyecto` still shows as the `<h1>` title.) Calendario de Observación already renders right after cronograma in viewer + DOCX — no new field.
- **Redacción + ejes + cronograma prompt rules.** Punto y aparte: each momento/activity is its own paragraph (no punto y seguido between distinct activities). Cronograma: full names, never abbreviate (e.g. "Estrategias Comunitarias para Espacios Libres de Violencia"). Ejes: one bullet per eje tied to a CONCRETE activity of this plan, not the generic definition.
- **Centro de interés: metodología + nombre.** Sub-plan headers (viewer + DOCX) now show "{metodología}: {nombre}" (e.g. "Centro de Interés: Conozcamos las letras"), metodología first.
- **Letters sub-plan no longer mentions numbers.** Reframed the `letter_number` prompt from "LETTER & NUMBER" → "LETTERS" with an explicit no-numbers guard (`lib/planner/subplan.ts`). **Note:** the shared vocab/pdaBank was NOT the leak (it's thematic English vocab, not numeric) — the prompt framing was; fixed there. Tested.
- **Format controls (her "century gotic" + spacing).** `Design` gains `font: 'century'` (web stack `'Century Gothic', Futura, 'Trebuchet MS'…`; real Century Gothic in Word via `DOCX_FONT`) and a `spacing` knob (line-height: Compacto/Normal/Amplio → viewer `lineHeight` + DOCX `paragraph.spacing.line`). Both surfaced in the Diseño panel. **ponytail: no webfont dep, no WYSIWYG.**
- **Book-pages UI clarity.** `nueva` page: relabeled to "Páginas del libro a trabajar" + note that they're cited in the project. **ponytail: skipped the `{libro,unidad,paginas}` repeater** — `UnitSelector` already captures book/unit, week1/week2 already reach the prompt, and a multi-row repeater fights the "max 4 fields" rule.

## Teacher-defined didactic units + privacy-safe names (current)

Source: Alan's real-vs-generated doc analysis. Closes the gap to Alejandra's real planeación (multiple units with different methodologies; named ajustes) **without a schema rewrite** — reuses the existing sub-plan pipeline. Plan: `~/.claude/plans/theres-a-new-lexical-mountain.md`.

- **Teacher-defined units per quincena.** New optional "🧩 Unidades didácticas" card in `nueva` (quincena only): per-row methodology `<select>` (`MODALIDADES` const) + nombre + tema/detalles, add/remove rows. Stored in new JSONB `fortnights.unidades_didacticas` (**migration `062`**, additive; conditional-spread insert → form works before it's pushed).
- **No schema rewrite — `proyecto` stays Unit 1.** `generate-document`: **Unit[0]** drives the top-level proyecto's methodology + structure; **units[1..]** become the `extras` (the source at the old `subplan_inventory` line now swaps to `fn.unidades_didacticas.slice(1)`), fed to the existing `generateCustomSubplan` with tema/días/libros folded into `spec.notes`. Letter & Number + Números stay auto.
- **Per-methodology Unit 1.** `METHODOLOGY_STRUCTURE` (`lib/planner/subplan.ts`) now **exported** + gained the 4 NEM metodologías globalizadoras (ABP Comunitarios, Indagación/STEAM, ABP, Aprendizaje-Servicio) with official fases. New `buildEstructuraProyectoBlock(metodologia)` renders the chosen methodology's headings into `<estructura_proyecto>` so Unit 1 can be a Taller Crítico / Centro de Interés, not always a Proyecto (falls back to the template's sections, then the schema default).
- **Privacy-safe named ajustes (names NEVER stored / NEVER to the LLM).** `plan_document` is embedded for RAG, so it must hold no names. At generation we embed only a names-free `_nee_mapping` (label→student_id). New `lib/planner/nee-names.ts`: `applyNeeNames(text, map)` (pure, tested) + `decryptNeeMap(mapping, supabase)` (decrypts the teacher's own students via the existing `decrypt()` / `calificaciones/contacts` pattern). Merge happens at **render only**: DOCX export (server) + viewer/print via new GET `/api/planner/nee-names`. The viewer **displays** real names but **edits** the anonymized text, so inline edits never persist names. Old plans (no `_nee_mapping`) no-op cleanly.
- **ponytail:** reused the existing parallel pipeline + `METHODOLOGY_STRUCTURE` instead of a `unidades_didacticas[]` schema rewrite (which would have broken viewer/export/section-order/RAG); one additive migration; no WYSIWYG.
- **Deferred (flagged):** _specific_ ajustes (areas + therapist notes) needs an encrypted `students.nee_notes` column + a student-profile data-entry surface (the code reads `nee_notes` but the column doesn't exist) — name-merge makes ajustes _named_, this makes them _specific_. Also still deferred: 4-week duration, dedicated modalidades catalog UI, calendario rotativo.
- Tests: `lib/planner/nee-names.test.ts`. Typecheck + lint clean. **Requires pushing migration 062.**

## Specific ajustes — per-student NEE data entry (current)

The keystone the name-merge depended on: **no student was ever flagged `has_nee`** (no UI set it), so the NEE name-merge above was inert and ajustes were always generic. This adds the data-entry surface + feeds it (anonymized) into generation.

- **Encrypted NEE notes.** Migration `063` adds `students.nee_notes_encrypted` (AES-256-GCM at rest, mirrors `first_name_encrypted` — disability data is sensitive PII).
- **Student NEE editor** on the student detail page (`app/(main)/alumnos/[id]/page.tsx`): "Apoyos y ajustes (NEE)" card — `has_nee` toggle + a note textarea ("áreas de apoyo y estrategias, SIN nombres"). Saves via new **PATCH `/api/students/[id]`** (Zod, owner-scoped, `encrypt()`s the note). GET `[id]` now also returns the decrypted `nee_note` (fetched **separately + best-effort** so a missing column can't 404 the page pre-migration).
- **Fed anonymized into generation** (`generate-document`): NEE notes are fetched separately (so a missing column can't drop `has_nee` detection), `decrypt()`ed, then **`scrubNames()`**'d before reaching the LLM, and injected tied only to "Alumno A/B". Combined with the render-time name-merge, ajustes are now both **specific** (her support notes) and **named** (in the document only).
- **Privacy invariant held:** the note is encrypted at rest; the LLM sees only de-identified, name-scrubbed support text under an anonymous label; real names appear only at render. The detail-page copy states this explicitly.
- **ponytail:** reused the existing student detail page (no new route/modal), the existing `encrypt`/`decrypt` + `scrubNames` helpers; single free-text note (no structured areas multi-select). Verified: typecheck + lint clean, **production build compiles**. **Requires pushing migration 063.**

## YouTube recommendations now open the real video (current)

- **Bug:** the "Videos Recomendados" material linked to a YouTube **search page** (`results?search_query=…`), not the specific video — because the recs are Claude-Haiku suggestions with no real video ids, so the code only had a title+channel to search with.
- **Fix:** `lib/materials/youtube.ts` now resolves each recommendation to a **real** video via the key-free **innertube search** (`youtubei/v1/search`, same public web key the caption fetch uses) → attaches `video_id` + a `watch?v=…` `url`, and shows the real title/channel/duration so the card matches what it opens. Best-effort + parallel; falls back to the old search url if a rec can't be resolved or YouTube blocks the request. `materiales/[id]` link prefers `v.url`. Verified live (innertube returns real ids). No migration. **ponytail:** reused the existing innertube approach instead of adding the YouTube Data API (key + quota); upgrade path noted in-code if datacenter IPs get blocked.

## Games — controls, real sound effects, word-search flashcard (current)

- **Start / Pause / Restart** in `GameShell` (so every game inherits them): a "Comenzar" start screen gates the game; Pause overlays + freezes the elapsed timer; Restart remounts the game fresh (`key={runId}`) + resets the timer.
- **Background music autoplays on Start** — the Start click is the user gesture browsers require, so `useGameAudio` now plays from there. Refactored to `{ muted, play, pause, toggleMute }`: **plays by default, mute to stop hearing** (was the inverse). Mute button is **bigger** (p-2.5, 22px) and color-states on/off.
- **Real win/fail sounds**: `useSound().win()` now plays `public/sounds/win_effect.mp3` and `.wrong()` plays `fail_effect.mp3` (synth tones kept as fallback). One hook change → all 9 games use them with **zero per-game edits** (they already call `sfx.win()`/`sfx.wrong()`); win fires on finish, fail on wrong moves.
- **Sopa de letras flashcard popup**: word hints are bigger + clickable; tapping opens a big flashcard (`WordFlashcard`) with the **picture** (VocabVisual — the meaning for pre-readers), the **word**, letter-by-letter **spelling**, and tap-to-hear **pronunciation** (TTS, auto-speaks on open). Note: word-search content only stores the word string, so a textual Spanish _meaning_ has no offline source — the picture serves as the visual meaning; enriching the builder with per-word translations is the upgrade path.
- No migration. Typecheck + lint clean, build compiles.

## Games — sorting categories, letter-recognition variety + both letters (current)

- **Sorting categories fit the actual words.** The prompt (`lib/materials/sorting.ts`) biased toward "animals vs objects", so people like _baby/astronaut_ got force-fit. Now it picks categories from what the words actually are (adds **Personas** for people/roles, **Acciones** for verbs, etc.) and is told to add a covering category rather than force a word into a wrong bin.
- **Letter-recognition distractors now vary.** The old prompt gave exactly 3 fixed foils per letter (A→H,V,N every item). Foils are now generated in **code** (`foilsFor`) from a richer visually-confusable **pool** per letter, **varied per item** (seeded shuffle) so options differ across items while staying confusable. Tested (`letter-recognition.test.ts`: distinct, never the target, varies across items).
- **Games cover BOTH letters of the week.** `buildLetterRecognition` now takes `letters: string | string[]`; the generate route passes `[letter_week1, letter_week2]` (was `letter_week1` only) and the prompt balances items across all focus letters (6–8 items, each item's target = its word's real initial). Note: only letter-recognition is letter-specific — the other games (sorting, word search, bingo, memorama…) already use the **full theme vocabulary**, so they span the week's content regardless of letter.
- No migration. Typecheck + lint clean.

## Games + materials UX batch (current)

- **Flashcards** (`FlashcardProjector`): fixed the "next skips a card when you don't flip" bug (was a stale-closure keyboard handler → now functional state updates + a stable listener; buttons already +1). Redesigned the card (soft gradient + shadow + pill flip-hint) — was too flat.
- **¿Cuál es la palabra? / Matching detail**: the detail lists only rendered `image_url ? <img>` with no emoji fallback, so most words showed nothing. Both now use `VocabVisual` (emoji → curated → image → text).
- **Memorama** (`materiales/[id]`): removed the redundant bottom menu Card; the inline game is the default play; **Compartir con alumnos + Modo Escucha** promoted to the top bar.
- **Material card colors** (`materiales` list): assigned by POSITION from an 8-color palette (`CARD_PALETTE`) instead of by type — every card is vivid and no two adjacent repeat (index%8 differs for grid neighbors). Was: several gray + adjacent blues.
- **Material card descriptions**: now show the planeación's project + the week's letters or Richmond unit (joined `fortnights(...)`), not just the time; added labels/icons for `youtube_videos`/`sorting_game`/`picture_word_match` (were raw type keys).
- **Create-material flow** (`materiales` page): **fixed a bug where the own-vocab chips were always empty** (read `d.items`, API returns `d.vocabulary`). Vocab source is now split: **"Mi vocabulario (por letra)"** (own words, by-letter quick-select) vs **"Richmond (por unidad)"** (live book catalog from `richmond_units`/`richmond_lesson_groups`, pick whole units or individual words) — the toggle only shows for Richmond teachers. The type picker expanded to all 8 standalone types (word_search + bingo stay planeación-only — their routes require a `fortnight_id`).
- No migration. Typecheck + lint clean, build compiles.
- **Per-word image upload (G8)** — teachers can upload a photo per vocabulary word; games use it. **Supabase Storage** (Alan's choice): migration `064` adds `vocabulary_items.image_url` + a public `vocab-images` bucket. New server route `POST /api/vocabulary/image` (service-role, ownership-checked, PNG/JPG/WebP ≤3 MB → `{teacher_id}/{word_id}.ext`, cache-busted public URL saved on the word). Vocabulary page: per-word upload button + thumbnail (own words only). Generation `imageMap` now merges `fetchTeacherVocabImages` (teacher photos **override** the Unsplash fallback) in both `materials/generate` + `generate-all`. **Requires pushing migration 064** (creates the bucket + column). Typecheck/lint/build clean.

## Bulk vocab images from a flashcard .docx (current)

Extends per-word images (G8) to a **bulk import** from a Word doc like Miss Ale's (a word, then its illustrating image, 5 per letter). **Parsed 100% client-side** so the big file (Alejandra's is 23 MB / 245 images) never hits the server — Vercel caps request bodies ~4.5 MB.

- **Client parser** `lib/vocab/docx-images.ts` (`extractVocabImagesFromDocx`): JSZip reads `word/document.xml` + rels; positional match = **the clean word token immediately before each image** (validated on the real doc → 129 distinct word→image pairs, correctly aligned); dedupes to one image per word; **resizes each to a ≤256px JPEG via `<canvas>`** (flatten transparency on white) → ~15 KB each, so ~130 words ≈ ~2 MB stored total. GIF/PNG sources all normalize to JPEG.
- **Image route** (`/api/vocabulary/image`) now accepts a `word` text (not just `word_id`): find-or-create the `vocabulary_items` row for the teacher (letter = first A-Z, color blue), then upload as before. So the importer just sends `(word, thumbnail)`.
- **Unified into the main "Subir archivo" upload** (`/vocabulario`): `handleImageExtract` detects a `.docx` with embedded images → runs the client parser → routes to a preview grid (word ↔ thumbnail, N found) → **"Guardar N imágenes"** uploads each sequentially with a progress counter (`standard` tier = 300/h, well above ~130), **creating the words + attaching images in one action** (find-or-create). If the doc has no images it falls back to the existing Claude-Vision text extraction. So the **first vocabulary upload** saves words _and_ their pictures at once — no separate button, no one-by-one. Games pick them up via the generation `imageMap` (teacher photos override Unsplash). (ponytail: word color isn't parsed from the doc — created words default to blue; the image is the point.)
- **No duplicates + "solo imágenes" toggle**: the route matches an existing word by text (case-insensitive, teacher-scoped) → attaches the image, never a second row. A **"Solo agregar imágenes a mis palabras existentes"** checkbox in the preview restricts the upload to words already in the teacher's bank (client filters against the loaded `vocabulary`), so a teacher who already has all their words can attach photos without creating anything — shows "X de Y coinciden".
- `jszip` added as a direct dep. Typecheck + lint + build clean. No migration (reuses the `vocab-images` bucket + `image_url` from 064).

## Planeación form: Mes plan type, drop "El proyecto" card, multi-letter weeks (current)

- **Third plan type "Mes"** (1 full month / 4 weeks) in the top toggle alongside Taller + Quincena. Ponytail: mes reuses the **quincena family** — same `QUINCENA_SYSTEM` + `buildQuincenaPrompt` + auto Letter&Number/Números sub-plans (gate `planType !== 'taller'`), plus a `<duracion>` block ("cubre UN MES COMPLETO, 4 semanas; distribuye a lo largo de 4 semanas") and a "PLANEACIÓN MENSUAL N" header. No new prompt.
- **"El proyecto" card deleted** — the project is now **Unidad 1 of the Unidades didácticas card**. `project_name`/`project_notes`/`number` (load-bearing across generation, DOCX title, RAG, materials) are **derived at insert time**: `project_name` ← Unit 1 nombre, `project_notes` ← Unit 1 tema, `number` auto (`min(12, maxForTeacher+1)`). Validates Unit 1 nombre non-empty. **"Valor del mes"** kept as one small optional Input relocated into the Fechas card.
- **Multi-letter weeks** — "Letra semana 1/2" accept comma-separated lists ("A, B"). `FortnightSchema` regex allows a comma list; `quincenaLetters` memo flat-splits so `letterVocab` covers every letter. Generation split: `materials/generate` letter-recognition flat-splits both weeks → `buildLetterRecognition(…, letters[])` (already array-capable); `deriveFortnightContext` takes the first letter for single-letter contexts.
- No migration (reuses `unidades_didacticas`, `plan_type`, existing columns). Typecheck + build clean.

## Security hardening batch (current)

- **Rate limiting fails CLOSED in prod** (`lib/rate-limit.ts`): missing Upstash env → 429 everything in production (dev/test stay open). Tested (`lib/rate-limit.test.ts`).
- **~14 previously-unthrottled routes now rate-limited** with per-endpoint buckets: waitlist (public, **IP-keyed strict** — was the biggest abuse hole), planner/nee-names (decrypts student names), richmond/credentials + available-units, teachers/me + email-template, school announcements/resources/teachers mutations (`school-write` bucket), materials/[id], planner/[id], fortnight-packs/[id] (relaxed — polled by pack progress). vocab image upload got its own `vocab-image` bucket (bulk import no longer eats the shared standard budget). Cron routes stay CRON_SECRET-only.
- **Magic-byte validation on vocab image upload** (`app/api/vocabulary/image`): now runs `validateFile` (signature + dimensions) — MIME strings are client-controlled.
- **CSRF hardened** (`middleware.ts`): cookie-carrying state-mutating API requests with NO Origin header are now rejected (browsers always send Origin on POST; its absence = not a normal browser). Bearer/extension path unchanged.
- **Failed logins now logged**: new `POST /api/auth/log-failure` (service-role — migration 013 restricts inserts; strict IP limit, always 200) called fire-and-forget from the login page. `failed_auth_attempts` finally gets data.
- **Dead `CSRF_SECRET`** removed from `.env.local.example` (never referenced).
- Deferred: nonce-based CSP rewrite (own project; Next.js needs `unsafe-inline` without nonces).
- Known pre-existing bug (not touched): `richmond/available-units` queries `teachers.user_id` (column is `auth_id`) → always returns empty units.

## Parent accounts — multiuser (current)

Teacher emails an invite → parent creates a real Supabase account → sees ONLY their child's homework status + materials the teacher explicitly shared. Parents are **NOT teachers** — zero changes to `teachers.role_type`, existing RLS, or teacher flows. The new `parent_links` table (**migration `065`**) is the entire authorization model: teacher-managed rows (RLS owner policy) + parent SELECT on `parent_auth_id = auth.uid()`. Child data reads follow the established service-role + verified-id pattern (`/jugar`-style).

- **Migration `065`**: `parent_links` (invite_token unique, invite_email encrypted AES-256-GCM, expires 7d, claimed_at/revoked_at, partial-unique on claimed links) + `materials.shared_with_parents boolean` (explicit flag — play_token alone also powers classroom projection).
- **Teacher API** `app/api/parent-links` (GET list w/ status, POST mint+Resend email, DELETE revoke). Ownership: student must be in the teacher's group. Audit-logged, strict rate limit. Invite email links `/familia/invitacion/[token]`.
- **Claim flow**: public landing page (service-role exact-token lookup, invalid/expirado/ya-usada states) → `ClaimInvite` button → logged-in claim via `POST /api/parent-links/claim` (service role, `canClaim` guard, first-claim-wins race guard) or `/register?parent_token=` (parent mode: familia copy, `user_metadata.role='parent'`, post-signup auto-claim → `/familia`; Google OAuth carries `next=/familia/invitacion/...`).
- **Routing**: auth callback + `(main)` layout route non-teacher users with parent links to `/familia` (not /onboarding). Middleware: `/familia` protected, `/familia/invitacion` public exception.
- **Parent area** `app/familia/(area)/page.tsx` (server-rendered, minimal layout, no teacher nav): per child — **Tareas** (richmond_scores → Entregado/Pendiente ONLY, never numeric, NEM rule) + **Juegos y materiales** (shared_with_parents + play_token → existing public `/jugar/[token]`, zero new game code). No claimed link → friendly no-access state.
- **Teacher UI**: "Invitar a familia" card on the student detail page (`components/parents/InviteFamilyCard.tsx` — email, status chips, revoke) + "Compartir con familias" toggle on the material detail (PATCH `/api/materials/[id]`, auto-mints play_token; column fetched best-effort so the page works pre-migration).
- **Helpers**: `lib/parents/links.ts` (mintInviteToken/linkStatus/canClaim/grantsAccess — tested), `lib/supabase/service.ts` (shared service-role client; existing inline usages left alone).
- ponytail: no email-match enforcement on claim (token IS the credential, same trust model as diary share); parent area is one server page, no client fetching.
- **Migration 065 APPLIED** (Alan ran it in the SQL editor); `lib/database.types.ts` regenerated (parent_links + shared_with_parents present). Note: the remote migration ledger is still empty — future `supabase db push` needs the one-time `supabase migration repair --status applied <001..065>`.
- Verified: typecheck clean, **129 tests passing (31 files)**, lint clean, production build compiles.

### Bug-fix follow-up (same batch)

- **`richmond/available-units` fixed**: queried `teachers.user_id` (column is `auth_id`) → always returned empty units. One-word fix.
- **Claim race closed**: `parent-links/claim` now checks the update affected a row (`.select('id')` + length) — a lost first-claim race returns 410 instead of a false `ok:true`.
- **`school/resources` file_url** now `https://`-only + max 2000 chars (was any `url()`).
- **Dead `logFailedAuth` deleted** from `lib/audit.ts` — it used the anon client, which RLS has blocked from inserting since migration 013; the working path is `/api/auth/log-failure` (service role).

## Alejandra feedback round 2 + materials 500 fix (current)

Source: her 6-point feedback + a ground-truth DOCX diff (her hand-made "Viajemos" May plan vs our generated one). No migrations.

- **materials/generate 500 fixed (3 layers)**: `checkRateLimit` no longer throws on Upstash REST failure (fail-open + loud log — a rotated/bad token was 500ing EVERY rate-limited route via the outer catch); the all-builders-failed 500 now includes the underlying builder error (`detail`) so prod logs identify env/model issues; `String(l).split` guard on multi-letter flatMap; `deriveFortnightContext` reads `fortnights.grade` (was reading a never-joined `groups.grade` → always ''). **Alan: verify UPSTASH_REDIS_REST_URL/TOKEN in Vercel** — if the token was rotated, that was the trigger.
- **Aventura lectora** → now a REQUIRED bullet inside `actividades_rutina` with the daily-new-word reflection (her exact ask); the standalone `aventura_lectora` section is no longer generated (model returns `""`; old plans still render).
- **Fichero de la Paz real fichas**: `scripts/parse-fichero-paz.mjs` parses `context/fichero_de_la_paz.md` → `lib/nem/fichero-paz.ts` (**19 preescolar fichas**, full activity text, Ficha 48 verified). Rotation is CODE-side (`lib/nem/ficha-rotation.ts`): generate-document collects `Ficha número N` citations from the teacher's past plans (continuity query now fetches last 12) and picks the first unused ficha → injected as `<ficha_de_la_paz>`; prompt requires opening with `Fichero de la Paz. Ficha número N "Nombre"` + that ficha's redacción, never inventing. Tested.
- **Pausas activas rotation**: last 2 plans' pausas injected as `<pausas_anteriores>`; rule: movement/refresh activities, change every 2 planeaciones.
- **Cronograma siglas**: estrategia comunitaria row now reads exactly **E.C.P.C.E.E.L.Y** (her ask) — seed cronograma + prompt exception (everything else stays full-name).
- **Calendario de observación**: auto-fills **2 alumnos/día** (roster cycling, editable) when empty; **first names only** everywhere — new `lib/planner/observation.ts` (`toFirstNames` w/ duplicate disambiguation, `distributeObservations`, `displayFirstName` used at render in viewer + DOCX so old plans with full legal names display clean). Prompt rule: app renders the calendar, model must NEVER duplicate it in text (fixes the doubled table+list in her export). Tested.
- **Proyecto structure (biggest gap)**: viewer + DOCX now render the teacher's real format — **"Metodología: {metodologia} — {nombre}"** heading → campos formativos tables (Contenidos | PDAs) INSIDE it → **DEL PROYECTO** subheading → the 5 momentos. The sibling campos section is absorbed (no-op) when a proyecto exists; old plans without proyecto render unchanged. Prompt hardened: momentos obligatorios with substantive content each ("un proyecto de un solo párrafo es un ERROR GRAVE"); normalize logs a warning if momento headings are missing.
- **Voice de-AI-fication**: new VOZ OPERATIVA rule — no justification clauses ("fomentando así…", "promoviendo…") unless the teacher's own examples use them; evaluación aspects must derive from THIS project's aprendizajes (generic aspects prohibited).
- Tests: `lib/nem/ficha-rotation.test.ts`, `lib/planner/observation.test.ts`, rate-limit Upstash-throw case. **139 tests passing (33 files)**, typecheck + lint clean, build compiles.

## Landing v5 — premium motion layer (lenis + choreography + Lottie seam + GTM) (current)

Inspired by an Awwwards-style Webflow stack teardown; adopted the _feel_, not the plumbing (no GSAP/jQuery/Swiper — framer-motion already covers scrub/timelines). Landing-only; the app keeps its calm design system. 2 new deps: `lenis`, `lottie-react`.

- **Smooth scroll**: `ReactLenis root` wraps the landing only (`LandingContent`), skipped entirely under `prefers-reduced-motion`.
- **Scroll choreography** (framer-motion, no new dep): hero content fades/shrinks on exit (`heroOpacity`/`heroScale` scrub); section titles reveal word-by-word (`StaggerTitle` — the SplitText effect, spaces kept OUTSIDE the inline-block spans so words don't glue); spotlight visuals get `Drift` scrub-parallax (drift slower than the page) nested with the existing `Float`.
- **Marquee trust strip**: pure CSS (`@keyframes marquee` in globals.css, two identical halves → -50% seamless loop, set ×3 per half); static wrap under reduced motion.
- **Testimonial carousel**: CSS scroll-snap `TestimonialCarousel`, data-driven `TESTIMONIALS` array — dots + snap appear automatically at >1 quote (pending quotes slot in with zero code).
- **Waitlist conversion moment**: warm-palette confetti (`celebrateWaitlist`, brand golds — canvas-confetti already installed, `disableForReducedMotion`) + `track('waitlist_submit')`.
- **Lottie seam** (`components/landing/LottieAccent.tsx`): renders `/public/lottie/{hero,success}.json` if present, silently nothing otherwise — Alan drops brand .json files in `public/lottie/` (README there) and they light up. Self-hosted → CSP-safe. No placeholder assets shipped (licensing).
- **Analytics** (`components/landing/Analytics.tsx`): GTM via `next/script`, loads ONLY when `NEXT_PUBLIC_GTM_ID` is set (placeholder in `.env.local.example`); GA4 + Meta Pixel get configured inside the GTM container, no code. `track()` helper pushes dataLayer events. CSP extended in `middleware.ts` (googletagmanager/facebook script-src, GA/FB connect-src, new frame-src for the noscript iframe) — inert while the ID is unset.
- Typecheck + lint clean, production build compiles. **Alan: set NEXT_PUBLIC_GTM_ID in Vercel when the GTM container exists.**

### App-wide motion pass (same session)

Calm, design-system-appropriate versions for the app (NOT the landing's marketing energy — no lenis in-app, work tools keep native scroll):

- **Page-enter transitions**: `components/ui/PageTransition.tsx` (fade + 8px rise, 320ms, reduced-motion → passthrough) mounted via `template.tsx` in `app/(main)`, `app/(auth)`, `app/familia/(area)` — every route transition animates from three 5-line files.
- **Staggered card entrances**: pure-CSS `.stagger-children` utility (globals.css, nth-child delays, `prefers-reduced-motion: no-preference` gated — works on server components, zero JS). Applied to: dashboard grids, alumnos grids, planeaciones lists, materiales cards grid.
- **Completion celebrations**: `celebrateWarm()` moved to `lib/ui/celebrate.ts` (shared with landing waitlist) — fires when the planeación document stream completes (`[id]` page `[DONE]`) and when MaterialGenerator finishes ("¡Listo!"). Games keep their own vivid `celebrate()`.
- Typecheck + lint clean, build compiles.

## Landing v4 — Amira-style terse + motion (current)

Alan's note: the objection-narrative landing felt flat/template-y and had way too much text. Rewrote `components/landing/LandingContent.tsx` composition (kept all primitives: motion presets, `useCountUp`, `WaitlistForm`, `PlannerVisual`/`MaterialsVisual`/`DiaryVisual`, mascot SVG). Copy cut ~65% (file 4,410→2,969 words incl. code; prose sections are now one-liners). New flow: hero (`Recupera tus domingos.` + one subline + floating mascot & product-card cluster with scroll **parallax** via `useScroll`/`useTransform`) → count-up stats band → 3 big floating visuals ("Todo tu trabajo, en un lugar") → 2 spotlights (Planeaciones / Materiales, large visuals slide in + `Chip` icon-rows replacing bullet paragraphs) → compact icon trust strip → one-line testimonial → CTA + waitlist. Added `Float` (infinite gentle-y) so the page is alive at rest; deleted the dead `ObjectionSection`/`VoiceVisual`/`RichmondVisual`/`FamilyVisual`. Design system honored (flat, warm tokens, DM Sans/Inter, weights ≤600). Waitlist logic + `?ref` unchanged. Typecheck/lint clean, 154 tests, build compiles.

## Logout + "my workspace" personalization (current)

No migration (all fields already on `teachers`). Initials-only avatars (no photos).

- **Logout** (was missing entirely from the live `(main)` shell): shared `components/auth/SignOutButton.tsx` (`link`/`button`/`icon` variants; `signOut()` → `/login`). Surfaced in: Configuración's new slim **"Cuenta"** card (email + Cerrar sesión, replacing the old Perfil card), the sidebar identity footer, the mobile "Más" sheet, and Mi Perfil. `app/familia/(area)/SignOutButton.tsx` now re-exports the shared one.
- **Sidebar identity** (`app/(main)/layout.tsx`): footer block with `InitialsAvatar` + teacher name → links to Mi Perfil, plus a logout icon. Layout now selects `full_name`. New `components/ui/InitialsAvatar.tsx` (deterministic initials, `bg-brand` circle).
- **Mi Perfil is the personalization hub** (`app/(main)/perfil/page.tsx`): avatar header (name + subject + role + school); `english_period_minutes` moved here from Configuración (de-duped); new **"Diseño de mis planeaciones"** card editing `teachers.design_settings` (font incl. century, size, spacing, line intensity, accent swatches) — the same global default the plan document viewer edits. Kept subject/teaching_style/profile_notes + admin team table.
- **PATCH schema aligned** (`app/api/teachers/me/route.ts`): `design_settings` now accepts `font: 'century'` + `spacing` (were silently rejected, mismatched with `PlanDocumentViewer`'s `Design` type).
- **By-name warmth**: `components/app/TeacherContext.tsx` exposes the teacher's name from the layout's existing fetch (zero extra fetches); planeaciones/materiales/alumnos empty states now greet by first name.
- Verified: typecheck + lint clean, **154 tests (36 files)**, build compiles. Design-system tokens throughout.

## La Maestra design system applied — whole app (current)

Rebuilt all UI to `MAESTRA_DESIGN_SYSTEM.md` (warm cream `#FAF7F2` page, brand gold `#B8860B`, flat fills, light-only, DM Sans display + Inter body, warm taupe borders, no pure black, weights ≤600).

- **Foundation**: `app/globals.css` + `tailwind.config.js` carry the full token set (`page/card/inset/brand{,-hover,-light,-subtle}/text-{primary,secondary,muted}/border{,-strong,-stronger}` + warm `success/warning/error/info` each with `.light`/`.text` + warm shadows + radius). Legacy semantic classes (`bg-bg`, `bg-surface`, `text-primary`, `primary`, `border-border`) are **remapped** to the palette so everything restyled centrally, with the new doc token names added alongside. DM Sans + Inter via `next/font` in `app/layout.tsx`; `font-display` utility for headings.
- **shadcn** (`button`/`card`/`input`/`badge`/`checkbox`/`textarea`/`skeleton`): match the doc — gold primary, bordered secondary, ghost/danger; cards border-only radius-lg; inputs focus ring brand-subtle; weights ≤600, active scale(0.98).
- **App shell** (`app/(main)/layout.tsx`): sidebar white/warm-border, nav active = `bg-brand-subtle text-brand`; mobile bottom nav gold-active.
- **Color sweep across ~30 internal files** (auth, familia, dashboard, perfil, configuración, vocabulario, alumnos, materiales, planeaciones, and `components/app|onboarding|parents`): grays→warm text/border tokens, purple/violet/indigo accents→brand, gradients→flat fills, semantic states→`success/warning/error/info` tokens, `font-bold`→`font-semibold`. Charts (`StudentProgressChart`/`StudentScoreTable`) recolored to warm semantic series (Logrado=success, En proceso=warning, Requiere apoyo=error, Sin evaluar=muted) — qualitative labels untouched, never numeric.
- **Deliberately kept vivid** (content-identification, not chrome): the vocab word-color picker (teacher-chosen), `CARD_PALETTE` 8-way positional material colors (violet/fuchsia swapped to teal/pink to honor the purple ban), matching-game blue/green columns, WhatsApp brand green, `/jugar` + `components/games` kid-facing play surfaces, and `PlanDocumentViewer`'s own document Design knobs. Loading shimmer gradient (transparent→white→transparent) kept as a motion effect.
- Verified: typecheck clean, lint clean, **154 tests passing (36 files)**, production build compiles. 46 files changed.

## Landing v3 — objection-resolution narrative (current)

Second pass on the restored landing: the page now reads as a scroll narrative where each section voices a skeptical teacher's doubt (italic quoted kicker, conversational Mexican Spanish) and answers it with a feature: NEM genérica → PDAs verbatim; suena a robot → Voz propia (new VoiceVisual); materiales a mano → 8 juegos; mi editorial → Richmond; más trabajo → Diario+Familias; mis datos → seguridad by-design (LFPDPPP, nombres cifrados, nunca números); cuánto tiempo → 3 pasos + antes/después + métricas. Shared data-driven `ObjectionSection`, alternating dark/white rhythm, 3 motion presets (fadeUp/slideIn/popIn). Waitlist hero + visuals + placeholders kept.

## Landing restored + deepened (current)

The waitlist commit (`cedb6a5`) had replaced the rich aurora landing with a basic 324-line capture page — regression fixed. `app/page.tsx` renders the restored + expanded `LandingContent.tsx` (aurora hero kept; waitlist email capture now lives INSIDE the hero with position/ref-link success state). New: compliance strip (NEM/SEP 2024 · cualitativa · LFPDPPP · PRONI), cómo-funciona 3 pasos, timeline expanded to 5 stops with checklists + mock visuals (Planeaciones NEM, Materiales y juegos 8 tipos, **Diario de la Educadora**, Richmond, **Familias**), before/after (4h→10min, PDAs verbatim), final CTA. Branding placeholders kept for the pending assets (character/logo/testimonial photo). `WaitlistLanding.tsx` left unused.

## Fidelity v2 — full-example injection + PDA precedence + game goals (current)

The three highest-leverage "low quality / not aligned" fixes (from the fidelity audit; approved earlier but never built):

- **Full example planeación injected** — extraction (`lib/planner/extract-template.ts`) now keeps the ENTIRE uploaded document text (name-scrubbed, ≤24k chars) as `profile.raw_text` (rides in the template JSONB, no migration). Generation appends it to the **cached** system prefix (`<planeacion_ejemplo_completa>` in `cachePrefix`, byte-identical across main + sub-plan calls → cached after first call), so the model always sees her real document as the primary voice/structure/depth exemplar instead of 200-char fragments. ⚠️ Only NEW uploads capture raw_text — **Alejandra must re-upload her format once** to activate it.
- **Teacher PDA bank now WINS** — `selectRelevantContenidos` (official-bank pre-selection) is skipped when the teacher's own `pda_bank` exists; the `<pda_bank>` block now instructs topic-relevant selection FROM her bank only. Fixes the precedence conflict where official contenidos overrode her format's.
- **Games practice the unit's goals** — `FortnightContext.learning_goals` + shared `classContextBlock` helper (`lib/materials/types.ts`, replaces 4 copy-pasted context blocks in games/flashcards/matching/worksheets). `materials/generate` resolves the fortnight's Richmond selection (`resolveSelectedContent`) and injects the unit's learning goals so materials practice what the unit teaches, not just its word list (lesson-plan path; best-effort).
- Competitor note (Teachy teardown, docs in session): their reusable pattern is library-first generation — we continue moving alignment-critical content into curated banks (fichero, contenidos, Richmond) rather than free generation.

## Material vocab provenance badges (current)

Teachers can already create games/flashcards from Richmond unit vocabulary on `/materiales` (source toggle from the earlier UX batch); this adds **identification**: every material created there now records where its vocabulary came from. Client computes a display-ready `vocab_source` (`{kind: richmond|letters|custom, label}` — "Unidad 3 — Food" / "Unidades 2, 3" / "Letras A · B" / topic) via `lib/materials/vocab-source.ts` (tested), POSTs it to `materials/generate` (Zod-validated), stored as **`content._vocab_source`** (JSONB — no migration). The materials list selects only `content->_vocab_source` and renders a colored badge per card (📚 purple Richmond / 🔤 blue letras / ✏️ gray tema). Old materials and fortnight-linked context lines unchanged. Scope decision (Alan): Richmond picker stays `/materiales`-only — NOT added to the planeación MaterialGenerator.

## Sonnet 5 migration (current)

All 4 Sonnet call sites moved `claude-sonnet-4-6` → **`claude-sonnet-5`** (better instruction-following for teacher-structure fidelity; intro pricing $2/$10 per MTok until 2026-08-31 — cheaper than 4.6). Required API changes applied per model migration guide: **removed the assistant `{` prefill** in `callPlannerModel` (400s on Sonnet 5; `parsePlanJson` already handles fences/preamble), **removed `temperature`** everywhere (non-default sampling params 400), **`thinking: {type:'disabled'}` set explicitly** (omitting it runs adaptive thinking by default → would burn output tokens on JSON tasks), and planner default `max_tokens` 16384→20000 (new tokenizer ~30% more tokens per text). Files: `lib/planner/model.ts`, `app/api/planner/generate/route.ts` (legacy), `app/api/vocabulary/extract/route.ts`, `lib/materials/song-worksheet.ts`. Haiku call sites unchanged. Note: API account hit its monthly usage cap (resets 2026-08-01) — Alan raising the limit in console; ~$0.35-0.40/planeación bundle on Sonnet 5 intro pricing.

## Campos formativos / PDA correctness — enforcement + precedence + modalidades (current)

Fixes "no incluye los campos formativos ni los PDA de la manera correcta". The 3 new school ground-truth docs (`context/campos-formativos-modalidades.md`, `contenidos-fase2.md`, `dosificacion-pda-lenguajes-jardin3.md`) were verified against `lib/nem/contenidos-fase2.ts` — the Contenido/PDA data was already in code verbatim (school tables have minor transcription variances; official Programa Sintético text wins per the docs' own note). Root cause was precedence + no enforcement, not missing data. No migration.

- **Deterministic snap-to-bank** (`lib/nem/enforce-contenidos.ts`, tested): after EVERY generation parse (main doc quincena/mes/taller + all sub-plans via the `subplan.ts` seam), each generated contenido is fuzzy-matched (accent-strip + prefix + token-Jaccard) against `CONTENIDOS_FASE2_3` + `PRONI_FASE2` and REPLACED with the official verbatim row — **full PDA desglose** (all PDAs of that contenido, the detail the school docs show), campo corrected if misfiled, invented contenidos dropped (warn), deduped, regrouped. Nothing-matched → keep model output (never empties a doc). Bank built lazily (grounding→subplan→enforce-contenidos import cycle is init-safe).
- **Precedence fix** (`generate-document/route.ts`): the teacher's extracted `pda_bank` (lossy LLM extraction) is NO LONGER "la ÚNICA fuente" — that block is deleted, and the official-bank Haiku shortlist (`selectRelevantContenidos`) now always runs; her `pda_bank` contenido titles are passed as a selection **hint** ("dales preferencia si son pertinentes"). `pdaBank` plumbing removed from sub-plan generation (the cached system prefix already carries the FULL official bank).
- **System prompt hardening** (`prompts/planner-quincena.ts`, `planner-taller.ts`, `subplan.ts`): DESGLOSE COMPLETO OBLIGATORIO — every chosen contenido carries TODOS its official 3er-grado PDAs verbatim (same number/order, no consolidating/omitting), replacing the old "2-6 PDAs"; terminology "PDA/Procesos de Desarrollo de Aprendizaje", never "aprendizajes esperados"; taller no longer demands "LOS 4 campos" (only relevant ones, mín 1).
- **Modalidades** (`campos-formativos-modalidades.md` → code): added **Rincones de Aprendizaje** (5 fases) + **Unidad Didáctica** (6 fases) to `METHODOLOGY_STRUCTURE` + the `MODALIDADES` picker + the quincena valid-metodologías list. New always-on `<modalidades>` block in `nemGroundingBlock` (rides the cached system prefix), rendered from `METHODOLOGY_STRUCTURE`: the 6 official modalidades with exact ordered fases + the core rule "todos los campos pueden trabajarse con CUALQUIER modalidad".
- Tests: `lib/nem/enforce-contenidos.test.ts` (9) + grounding modalidades test. Typecheck + lint clean.
- **KB state audit (same session, live DB probe)**: migrations 054–066 ALL applied remotely (probe verified columns/tables); `nem_knowledge` ingested (77 chunks: Evaluación 7 / PRONI 14 / Plan-2022 21 / Programa prose 35) and `match_nem_knowledge` RPC returns rows. **No new migrations needed for the KB** — the 3 new context docs are correctly NOT ingested (modalidades → always-on grounding; contenidos/dosificación → verbatim code banks). `<conocimiento_nem>` now also injected for TALLER plans (query "Taller Crítico {tema} evaluación formativa preescolar"); was quincena/mes-only. ⚠️ Both stored EPA templates have NO `raw_text` (pre-Fidelity-v2 uploads) — the full-example injection is still inert until Alejandra's format is re-uploaded once. `planeacion_embeddings` 1 row / 1 plan (consistent, grows with use); `plan_corrections` 0 (loop live, no edits yet).
- **Review pass (same session)**: `METHODOLOGY_STRUCTURE`/`buildEstructuraProyectoBlock` extracted to leaf `lib/planner/methodologies.ts` (subplan re-exports) — kills the grounding→subplan→enforce-contenidos→grounding import cycle, so the enforce bank is a plain top-level const again (no lazy-init guard). `<modalidades>` fases now strip "N° Momento:" prefixes (read like the official doc). Enforced campos sorted in canonical Fase 2 order (Lenguajes → Saberes → Ética → De lo Humano). Dead `pdaCtx` removed from subplan prompts.

## NEM knowledge RAG layer (current)

Knowledge-retrieval over the institutional NEM corpus (`context/*.md`) so generation retrieves EXACT relevant passages (long-tail: metodologías, evaluación formativa, PRONI, Plan 2022) — COMPLEMENTS the always-on `NEM_SYNTHESIS` + `nemGroundingBlock` (unchanged exactness layer), does not replace them.

- **Migration `066_nem_knowledge.sql`**: `nem_knowledge` (source, heading_path breadcrumb, content, tokens, `vector(1536)`, ivfflat index — mirrors 054). RLS: SELECT for `authenticated` only (official SEP knowledge, not sensitive); NO insert policy — only the service role (ingestion script) writes. RPC `match_nem_knowledge(query_embedding, match_count)` mirrors `match_planeaciones`.
- **Chunking** (`lib/nem/chunking.ts` `chunkMarkdown`, pure + tested): heading-aware — splits on markdown headings with a "H1 > H2 > H3" breadcrumb stack, packs sections into ~2000-3600 char chunks (~500-900 tokens, headings kept inline so packed chunks stay self-describing), long sections split on paragraph boundaries with a 1-paragraph overlap; `skipHeading` option filters sections.
- **Ingestion** (`scripts/ingest-nem-knowledge.mjs`, run with **`npx tsx`** — it imports the TS chunker): reads `context/*.md`, embeds via OpenAI `text-embedding-3-small` (batched 64/call), wipe-and-reload per source file (idempotent). **Corpus**: Evaluacion-Formativa-Fase2 (7 chunks), PRONI_2024-2025 (14), Plan-de-Estudio-2022 (21), Programa_sintetico_fase_2 **prose only** (35 — the `### Contenido:` PDA tables are skipped, already verbatim in `lib/nem/contenidos-fase2.ts`). **Excluded**: `fichero_de_la_paz.md` (served exactly via `lib/nem/fichero-paz.ts`) and `NEM_SYNTHESIS.md` (already always-on in every prompt). ~77 chunks total.
- **Retrieval** (`lib/nem/knowledge.ts`): `matchNemKnowledge(supabase, queryText, k=6)` (reuses `embed` from `lib/planner/embeddings`) → `nemKnowledgeBlock(chunks)` renders `<conocimiento_nem>` — each passage cited as `Según [Evaluación Formativa Fase 2 (SEP), "…breadcrumb…"]:` + "fundamenta la planeación en ellos, NUNCA los contradigas", capped ~6k chars. Best-effort everywhere: no `OPENAI_API_KEY` / migration 066 not pushed / not ingested / any error → `''`, generation unaffected.
- **Wired into `generate-document`** (quincena + mes only, not taller): query = `{metodología de la Unidad 1} {project_name} {project_notes} evaluación formativa preescolar`; block injected in `buildQuincenaPrompt`'s array right after `contenidosBlock`. Query-dependent → deliberately NOT in `cachePrefix`.
- Tests: `lib/nem/chunking.test.ts` (breadcrumbs, size bounds, packing, overlap, skipHeading, min-size noise) + `lib/nem/knowledge.test.ts` (block formatting, source labels, 6k cap). **154 tests passing (36 files)**.
- **Requires pushing migration 066 + running `npx tsx scripts/ingest-nem-knowledge.mjs`** (needs `OPENAI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`). Caveat: the remote migration ledger is still empty — before `supabase db push` works, run the one-time `supabase migration repair --status applied <001..065>` (or apply 066 via the SQL editor as with 057/065).

## Games/materials batch — teacher images win, English categories, Aa letters, app font, worksheet render, letter songs (current)

Six fixes from Alan's account testing. No migrations.

- **Teacher-uploaded vocab images now WIN in every game** (`components/games/VocabVisual.tsx`): a `/vocab-images/` (Supabase bucket) `image_url` renders FIRST, before emoji (order now: teacher image → valid emoji → curated map → Unsplash → text). Retroactive for any material whose content already carries the URL; **materials generated before the images were uploaded need a regenerate** to bake the URLs in.
- **Sorting game categories in English** (`lib/materials/sorting.ts` prompt): "Animals / Things / People"-style names instead of Spanish (it's an English class). Existing sorting materials keep Spanish until regenerated.
- **Letter recognition shows both cases** (`LetterRecognitionGame.tsx`): choice buttons render "Aa" (upper+lower together); answer matching unchanged (case-insensitive).
- **App-wide interface font** — new `design_settings.app_font` (`default|sans|serif|rounded|century`, JSONB, no migration): shared stacks in `lib/design/fonts.ts` (PlanDocumentViewer imports it now), Zod accepts it in `teachers/me`, the `(main)` shell overrides `--font-inter`/`--font-dm-sans` + `fontFamily` on its wrapper (so Tailwind font classes AND the globals h1-h3 rule follow), perfil "Diseño" card gains a "Tipografía de la aplicación" select (page reloads on change to apply), and public `/jugar/[token]` applies the owning teacher's font via service-role lookup. Plan-document `font` stays independent. Skipped: `/familia` (parents) and the `(app)` shell (only serves /onboarding — pre-preference).
- **"Hoja de Trabajo" was blank** — the detail page had NO render branch for `type='worksheet'` (and the PDF exporter read a stale shape that crashed on matching activities). Added the branch (`materiales/[id]`): per activity title + teacher_instruction; circling items render shuffled VocabVisual option tiles (correct highlighted) via new `foil_words` in WORKSHEETS_PROMPT; matching pairs render word→dashed line→visual (+translation). `WorksheetPdfDocument` + the `WorksheetActivity` type fixed to the real prompt shape (old string-items content still renders).
- **Bounce Patrol letter songs always included** in YouTube materials: baked A–Z map `BOUNCE_PATROL_LETTER_SONGS` in `lib/materials/youtube.ts` (all 26 ids resolved + title/channel-verified via innertube, 2026-07; Z = US "Zee" version), `buildYoutubeRecommendations(..., letters)` prepends one per focus letter (dedup vs AI picks; `searchYoutube` fallback if an id is ever missing), generate route passes the fortnight's `letter_week1/2` (comma-lists split). Tested (`lib/materials/youtube.test.ts`).
- **Review pass (same session, 8-angle + fixes)**: letter songs now fire on the MAIN path — `materials/generate` accepts `fortnight_id` (MaterialGenerator sends it), fetches the fortnight owner-checked, and derives letters/theme/ctx/Richmond-goals from it (previously all fortnight context was lesson_plan-only → letter songs + unit goals were inert from the document view); `teachers/me` PATCH now MERGES `design_settings` server-side (the plan viewer's partial save was wiping `app_font`); `VocabVisual` tracks the failed URL, not a boolean (one dead image no longer kills images for the rest of the game) + single `<img>` block; youtube builder returns letter-songs-only if the Haiku step fails (usage cap resilience) and `bouncePatrolLetterVideos` is a sync pure map (dead unreachable fallback removed, honest comment); shared `appFontStyle()` used by shell + `/jugar` (shared-game headings now follow the font too) and the plan sheet pins `--font-dm-sans/--font-inter` to the DOCUMENT font so the interface font can't leak into the paper/print; `/jugar` uses the shared service client + ONE joined query (`teachers(design_settings)` embed); worksheet types+`normalizeWorksheetItems` extracted to leaf `lib/materials/worksheet-content.ts` (client page no longer imports the Anthropic-SDK module; screen+PDF share one normalization), PDF circling prints shuffled equal options (was revealing the answer), legacy `pairs.description` fallback, legacy single-option circling grid hidden, dead PDF styles deleted; `fortnightLetters()` helper in `lib/materials/types.ts` (dedups 2 route copies); `FontKey` reused in viewer + perfil types; youtube card "channel · duration" no longer dangles. Skipped deliberately: perfil full-reload on app_font change, design-card field count (pre-existing), tracing/writing legacy PDF branches (prompt has prohibited tracing since long before), baked-id liveness checks.
- Verified after review: typecheck + lint clean, **167 tests passing (38 files)**, production build compiles.

## Games polish — live teacher images, filler text removed, root-level font (current)

Round 2 of Alan's game testing. No migrations.

- **Teacher drawings now resolve at RENDER time** (`components/games/TeacherImages.tsx`): `TeacherVocabImages` context provider + `useTeacherImage(word)` consumed by `VocabVisual` — a live word→bucket-URL map BEATS stored content, so **every material (even ones generated before the images were uploaded) shows her drawings with zero regeneration**. Mounted on all 4 game surfaces: materiales/[id] (whole page — games + detail lists), materiales/[id]/jugar, materiales/[id]/proyectar (FlashcardProjector), and public /jugar/[token] (server-fetched map via service role, passed as prop since there's no auth). In-app it self-fetches `vocabulary_items` (RLS-scoped, best-effort `select('*')`).
- **Internal filler text stripped from game surfaces**: memorama card "palabra" label (MemoryMatch); matching detail "palabra" label + `image_description` (the Spanish Unsplash query, e.g. "hormiga negra pequeña vista de frente"); letter-recognition detail `image_description`; picture-word-match detail "Foils: …"; song-worksheet vocab cards show VocabVisual instead of the description.
- **App font applied at `document.documentElement`** ((main) layout useEffect, cleanup on exit) instead of the wrapper div — reaches every component including portal-rendered overlays; letter-recognition choice buttons dropped `font-mono` so they follow the teacher's font (projector phonetics keep mono deliberately).
- Verified: typecheck + lint clean, 169 tests, production build compiles.

## Group archiving — "Nuevo ciclo escolar" (current)

End-of-school-year flow: archive the current group(s) — students and planeaciones PRESERVED (unlike delete, which cascades) — and create the new cohort's group. **Migration `067_group_archive.sql`**: `groups.archived_at timestamptz` + partial index (mirrors the `revoked_at` soft-delete pattern).

- **Configuración**: "Nuevo ciclo escolar" button (shown when active groups exist) → confirm → sets `archived_at` on ALL the teacher's active groups → opens the group creator (academic_year already defaults to the current cycle). Collapsed **"Grupos archivados (N)"** `<details>` section with per-group **Restaurar**. Hard delete unchanged.
- **Hidden everywhere when archived** — `lib/groups/archive.ts` (`activeGroups`/`archivedGroups`, tested): alumnos roster page + `GET /api/students` (join filter — students of archived groups leave rosters), planeaciones/nueva group picker, Richmond dashboard selector, calificaciones tracker (`scores` route now also scopes 'all'-assignments to active group ids), and the **generate-document grade fan-out** (new planeaciones never target archived cohorts).
- **Pre-migration safe by design**: every touched query switched to `select('*')` + JS filtering — a missing `archived_at` column simply reads as active, so deploying before running 067 breaks nothing (archiving itself errors with a toast until 067 is applied). `teachers/me` group-count deliberately still counts archived groups (an all-archived teacher is NOT bounced back to onboarding).
- Deliberately NOT filtered: Richmond sync/extension routes (historical data keeps flowing to its group), old fortnights' representative `group_id` (planeaciones history intact).
- **Requires applying migration 067** (SQL editor, like 065/066 — remote migration ledger still unrepaired).
- Verified: typecheck + lint clean, **169 tests passing (39 files)**, production build compiles.

## Deployment

- Vercel auto-deploys on push to main
- **Schema applied through 058** (per Alan); **migrations 059 (`fortnights.grade`) + 060 (template school-sharing) + 062 (`fortnights.unidades_didacticas`) + 063 (`students.nee_notes_encrypted`) + 064 (`vocabulary_items.image_url` + `vocab-images` bucket) pending push** — per-grade planeaciones, format sharing, teacher-defined units, per-student NEE notes, and per-word images need them (all degrade gracefully until pushed; 061 = waitlist). After pushing, regen `lib/database.types.ts`.
- **Format sharing (migration 060)**: teachers can share their own formats with their school (others use read-only); admins mark official "Formato de la escuela". RLS adds a school-shared SELECT policy on `teacher_plan_templates` (`school_id` + `shared_with_school` + `is_school_official` columns); API GET returns own+shared, PATCH toggles share/official (official admin-only), generation prefers own formats then official/shared. Requires pushing migration 060.
- Richmond TG5A catalog content (migration 057) loaded via SQL editor by Alan
- After pushing migrations: run `supabase gen types typescript --linked > lib/database.types.ts` (may be stale), and hit `/api/cron/backfill-diary` once with the CRON_SECRET bearer to encrypt pre-existing diary rows
- `NEXT_PUBLIC_SUPPORT_EMAIL` — optional, defaults to soporte@maestraia.com on verify-email page
- Upstash Redis, CSRF_SECRET, RESEND_API_KEY, ENCRYPTION_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY set in Vercel env
- Production domain: maestraia.com / maestraai.mx

---
