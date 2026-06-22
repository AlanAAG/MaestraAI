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
- GPT-4o-mini primary / claude-sonnet-4-6 fallback
- Teacher voice fidelity: "VOZ DE LA MAESTRA" few-shot injection from uploaded template
- Per-group schedule: letter_number_day + numeros_day from groups.fixed_weekly_schedule (no hardcoding)
- Sub-plans: on-demand Letter & Number / Numeros generation (claude-haiku-4-5)
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
- **Game audio feedback** — match/wrong/complete sounds in Memory Match and other games
- **Game difficulty levels** — small/medium/large card set modes in Memory Match
- **Word Scramble / Simon Says** — additional game types

---

## Current focus — Phase 6: Quality & Polish

1. **Planeaciones output quality** — improve prompt fidelity, structure, NEM depth, day-by-day coherence
2. **Landing page design** — conversion-focused, Awwwards-level EdTech aesthetic
3. **Dashboard & overall app design** — typography, spacing, color consistency, mobile polish
4. **Games quality** — audio feedback, smoother animations, better UX on tablets/projectors
5. **Branding** — logo, color system, consistent visual identity across app + landing

---

## Deployment

- Vercel auto-deploys on push to main
- All migrations applied through 042; **044 + 045 pending push by Alan** (Docker unavailable locally)
- After pushing migrations: run `supabase gen types typescript --linked > lib/database.types.ts` (it is stale — missing fortnight_packs, richmond_interactive_content, parent_contacts, teacher_plan_templates + several columns), and hit `/api/cron/backfill-diary` once with the CRON_SECRET bearer to encrypt pre-existing diary rows
- `NEXT_PUBLIC_SUPPORT_EMAIL` — optional, defaults to soporte@maestraia.com on verify-email page
- Upstash Redis, CSRF_SECRET, RESEND_API_KEY, ENCRYPTION_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY set in Vercel env
- Production domain: maestraia.com / maestraai.mx

---

## Session log

| Date       | What was shipped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-21 | DB security + agnostic hardening — migration 044 (fix teacher role_type self-escalation via trigger, lock archive_old_audit_logs from PUBLIC, drop dead columns teachers.role/vocab color_code+color_hex, schools onboarding via list_schools_for_onboarding RPC instead of world-readable table); migration 045 (encrypt diary q1–q5 at rest, drop richmond_scores plaintext name columns); fixed import-batch writing plaintext minors' names; play-token now crypto.randomUUID; onboarding stops writing legacy role; password floor 6→8; callback open-redirect guard; compartir rate limit; de-hardcoded martes/jueves/RICHMOND in planner prompts (now per-group schedule); wa.me country-code heuristic; support email env. Fixed register→/verify-email 404. Repo hygiene: removed dup 020 migration files + .DS_Store. KNOWN/DEFERRED: report_cards.\*\_obs encryption (no feature/code yet — encrypt at build time); fortnight_packs.material_ids[] redundant with materials.fortnight_pack_id (works, left as-is) |
| 2026-06-19 | fix(dashboard): remove 'Frase para maestras' label from phrase card — regression from husky stash/restore cycle. SHA 956eb0e                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-06-18 | Per-group schedule customization + plan gap fixes — removed all hardcoded day rules, schedule read from groups.fixed_weekly_schedule; sub_planes preservation on regenerate; PATCH /api/planner/update-document; GroupEditor day dropdowns; PlanDocumentViewer inline edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-06-18 | Security hardening + public landing page + rate limiting — Google OAuth, rate limiting on 7 previously unprotected routes, public landing page with dual CTA, register ?type param                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-06-17 | Document-style plan system — quincena/taller formats, migration 042, template extraction, SSE generation, DOCX export, ObservationCalendar, PlanDocumentViewer; post-redesign dead code cleanup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-16 | Diary migrated to main app; UX/config improvements; GPT-4o-mini primary; teacher voice fidelity; dashboard phrase card + full mobile responsiveness; legal pages; design audit; parent contacts + email notifications                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-06-15 | Editorial-agnostic registry; school interconnectivity; Richmond analytics; Chrome extension improvements; vocabulary chip selector; materials standalone mode; templates, diary auth, calificaciones grid, bug fixes, security audit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-06-14 | Game engine audit; Chrome extension Web Store audit; CI + regression tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-06-10 | Git recovery + Vercel build fix; game engine phases 1-4 (images, audio, shareable tokens, autonomous generation); new game types; Richmond unit linkage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-06-08 | Security hardening phase 2 (CSRF, CSP, auth guards); Richmond ToS compliance; games expansion (Bingo, Word Search, Letter Recognition, Song Worksheet)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-28 | Security infrastructure: rate-limit, file-validation, audit, csrf libraries; critical RLS + API bug fixes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-27 | Phase 3: PDF export, lesson editing, materials, projectable flashcards, student dashboard, NEM/PRONI alignment, vocabulary management                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-25 | Phase 2: lesson planner, fortnight CRUD, streaming AI generation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | Phase 0-1: infrastructure, auth, onboarding, Richmond sync, Chrome extension                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
