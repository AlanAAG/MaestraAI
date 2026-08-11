MaestraAI — Project Progress
Claude: update this file after every coding session before ending. Add what was built, what changed, and what's next. Keep it accurate — this is the single source of truth for project state.

Current phase: Phase 6 — Quality & Polish

## Current state

- Next.js 14 App Router + Tailwind v3 + shadcn/ui + Supabase
- **207 tests passing (46 files)**, typecheck + lint clean, production build on Vercel
- Migrations applied through **069** — verified live against the remote DB (all tables/columns respond)
- Remote migration ledger unrepaired — apply future migrations via SQL editor until `supabase migration repair` is run

## What exists

See git history for full feature log. Major systems:

- **Lesson Planner**: Quincena / Taller / Mes plans, NEM/PRONI alignment, 4-week support, teacher voice RAG, self-improving learning loop, per-unit contenidos + PDA (per contenido, grade-aware 1°/2°/3°) + ejes + methodology dropdowns, auto-fill blank NEM fields, DOCX/PDF export, inline editing
- **Materials & Games**: 9 game types (incl. digital coloring: big picture + crayons/brush/eraser/undo/save, on screen and shareable via play token), flashcards, worksheets, bingo, word search, sorting, picture-word-match, memorama — all shareable via play token (/jugar/[token]); teacher-uploaded vocab images win in every game
- **Richmond integration**: Chrome extension sync, CSV/XLSX import, analytics dashboard, TG5A catalog (migration 057 applied), per-unit vocabulary in lesson plans
- **Auth & Onboarding**: Email/password + Google OAuth, 7-step wizard, consent records
- **Parent accounts**: Invite flow, /familia area, shared materials toggle (migration 065 applied)
- **Home play (juegos en casa)**: anonymous kid profiles (apodo + avatar, no PII) on `/jugar/[token]`, aciertos stored per run, homework threshold per game ("mínimo N aciertos → si no, repetir"), parent links the child's profile with a 6-char code and sees the aciertos in /familia (teacher can turn results off in Perfil), teacher sees "quién ha jugado en casa" + can email the link to all invited families (migration 069 applied)
- **Group archiving**: "Nuevo ciclo escolar" soft-archive (migration 067 applied)
- **NEM grounding**: Verbatim contenidos bank (35 items, full 1°/2°/3° PDA desglose — grounding, prompt block and snap-to-bank all use the plan's grade), enforce-contenidos snap, NEM knowledge RAG (migration 066 applied + ingested), fichero de la paz rotation, auto-ficha picker
- **Design system**: Warm cream palette, 12 app color themes, app font picker, FOUC-free cookie pre-paint
- **Security**: Rate limiting (fails closed in prod), CSRF hardening, magic-byte file validation, failed login logging
- **Landing**: Lenis smooth scroll, scroll choreography, GTM seam, confetti on waitlist submit

## Pending migrations

None — everything through 069 is applied (verified 2026-08-10 via REST probes).
Still TODO once: `supabase migration repair` + `supabase gen types typescript --linked > lib/database.types.ts`

## What does NOT exist yet

- Report cards generator (trimestral qualitative, post-launch)
- Admin dashboard (school-admin analytics)
- Game difficulty levels (UX decision pending)
- Word Scramble / Simon Says game types
