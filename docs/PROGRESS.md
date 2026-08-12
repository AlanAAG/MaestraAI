MaestraAI — Project Progress
Claude: update this file after every coding session before ending. Add what was built, what changed, and what's next. Keep it accurate — this is the single source of truth for project state.

Current phase: Phase 6 — Quality & Polish

## Current state

- Next.js 14 App Router + Tailwind v3 + shadcn/ui + Supabase
- **237 tests passing (51 files)**, typecheck + lint clean, production build on Vercel
- Migrations applied through **079**
- Migration ledger repaired — `supabase db push` works normally

## What exists

See git history for full feature log. Major systems:

- **Lesson Planner**: Quincena / Taller / Mes plans, NEM/PRONI alignment, 4-week support, teacher voice RAG, self-improving learning loop, Gamificación como metodología (plan completo como juego: narrativa, misiones, logros — evaluación sigue cualitativa), per-unit contenidos + PDA (per contenido, grade-aware 1°/2°/3°) + ejes + methodology dropdowns, auto-fill blank NEM fields, DOCX/PDF export, inline editing, Números por semana, archivos de apoyo adjuntos (PDF/DOCX/imagen → texto extraído al prompt, migration 075), split documents (principal + Letters + Números por separado, elegible al crear), validador local estricto de formato en cada generación (\_format_issues) + telemetría de tokens por llamada, feedback loop (rating 1-5 + comentarios por sección estilo Word + regenerar sección con el comentario; alimenta el perfil aprendido — migrations 070-071)
- **Materials & Games**: 9 game types (incl. digital coloring: big picture + crayons/brush/eraser/undo/save, on screen and shareable via play token), flashcards, worksheets, bingo, word search, sorting, picture-word-match, memorama — all shareable via play token (/jugar/[token]); teacher-uploaded vocab images win in every game
- **Richmond integration**: Chrome extension sync (v1.1.0 empaquetada y lista para Chrome Web Store — permisos mínimos, expediente en docs/extension-store-submission.md), CSV/XLSX import, analytics dashboard, TG5A catalog (migration 057 applied), per-unit vocabulary in lesson plans
- **Auth & Onboarding**: Email/password + Google OAuth, 7-step wizard, consent records
- **Parent accounts**: Invite flow, /familia area, shared materials toggle (migration 065 applied)
- **School environment**: escuela → maestra → grupos → familias con roles y RLS. Director (role_type admin) define el portal `/escuela/<slug>`, allowlist de correos (school_invites) con invitación por email y claim automático al registrarse; foro de dudas por grupo (familias preguntan, la miss responde, con notificación por correo al otro lado); archivos adjuntos en anuncios/tareas (bucket privado class-files, URLs firmadas con chequeo de membresía) y entrega de tareas por las familias con vista de entregas por alumno (migrations 076-079)
- **Group classroom (/grupos)**: Classroom-style wall per group — anuncios + tareas (material asignado + fecha límite), publicación manda correo automático a todas las familias del grupo (contactos de ficha + papás invitados, dedup), /familia muestra el muro por hijo con Entregado/Pendiente vía game_plays (migration 074)
- **Home play (juegos en casa)**: anonymous kid profiles (apodo + avatar, no PII) on `/jugar/[token]`, aciertos stored per run, homework threshold per game ("mínimo N aciertos → si no, repetir"), parent links the child's profile with a 6-char code and sees the aciertos in /familia (teacher can turn results off in Perfil), teacher sees "quién ha jugado en casa" + can email the link to all invited families (migration 069 applied)
- **Group archiving**: "Nuevo ciclo escolar" soft-archive (migration 067 applied)
- **NEM grounding**: Verbatim contenidos bank (35 items, full 1°/2°/3° PDA desglose — grounding, prompt block and snap-to-bank all use the plan's grade), enforce-contenidos snap, NEM knowledge RAG (migration 066 applied + ingested), fichero de la paz rotation, auto-ficha picker
- **Design system**: Warm cream palette, 12 app color themes, app font picker, FOUC-free cookie pre-paint
- **Security**: Rate limiting (fails closed in prod), CSRF hardening, magic-byte file validation, failed login logging
- **Landing**: Lenis smooth scroll, scroll choreography, GTM seam, confetti on waitlist submit

## Pending migrations

None — everything through 069 is applied, ledger repaired, types regenerated (2026-08-10).

## What does NOT exist yet

- Report cards generator (trimestral qualitative, post-launch)
- Admin dashboard (school-admin analytics)
- Game difficulty levels (UX decision pending)
- Word Scramble / Simon Says game types
