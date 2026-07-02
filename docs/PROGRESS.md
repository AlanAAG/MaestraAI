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
