MaestraAI — Project Progress
Claude: update this file after every coding session before ending. Add what was built, what changed, and what's next. Keep it accurate — this is the single source of truth for project state.

Current phase: Phase 6 — Quality & Polish

## Current state

- Next.js 14 App Router + Tailwind v3 + shadcn/ui + Supabase
- **272 tests passing (60 files)**, typecheck + lint clean, production build on Vercel
- Migrations applied through **083**
- Migration ledger repaired — `supabase db push` works normally

## What exists

See git history for full feature log. Major systems:

- **Lesson Planner**: Quincena / Taller / Mes plans, NEM/PRONI alignment, 4-week support, teacher voice RAG, self-improving learning loop, Gamificación como metodología (plan completo como juego: narrativa, misiones, logros — evaluación sigue cualitativa), per-unit contenidos + PDA (per contenido, grade-aware 1°/2°/3°) + ejes + methodology dropdowns, auto-fill blank NEM fields, DOCX/PDF export, inline editing, Números por semana, archivos de apoyo adjuntos hasta 50MB (subida directa a Storage, PDFs gigantes partidos por páginas, selector de páginas estilo iLovePDF para elegir qué se anexa, RAG por archivo con chunks+embeddings, hasta 10 archivos por plan (recuperación escalada + por sección: fragmentos propios para Letters, Números y cada unidad personalizada; cron diario limpia chunks/archivos huérfanos) — migrations 075+080, sección Anexos en el documento), split documents (principal + Letters + Números por separado, elegible al crear), validador local estricto de formato en cada generación (\_format_issues) + telemetría de tokens por llamada, feedback loop (rating 1-5 + comentarios por sección estilo Word + regenerar sección con el comentario; alimenta el perfil aprendido — migrations 070-071)
- **Materials & Games**: 9 game types (incl. digital coloring: big picture + crayons/brush/eraser/undo/save, on screen and shareable via play token), flashcards, worksheets, bingo, word search, sorting, picture-word-match, memorama — all shareable via play token (/jugar/[token]); teacher-uploaded vocab images win in every game
- **Richmond integration**: Chrome extension sync (v1.2.0 empaquetada y lista para Chrome Web Store — popup con onboarding "Configura en 3 pasos", formulario de clave colapsable — permisos mínimos, expediente en docs/extension-store-submission.md), CSV/XLSX import, analytics dashboard, TG5A catalog (migration 057 applied), per-unit vocabulary in lesson plans
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

- **Multiuser overhaul (2026-08-24)**:
  - **Espacio del alumno** `/familia/[student]`: página completa por hijo (vocabulario de la quincena con dibujos de la miss, juegos como botones grandes, tareas + entregas, avisos + adjuntos), con el tema visual de la maestra. El padre entra con su Google (sin PII de menores); en `/jugar/[token]` un padre con sesión salta la pantalla de apodo — el juego usa el perfil vinculado del hijo (filtrado por teacher del material). Lógica compartida extraída a `lib/parents/child-data.ts` (+ fix: adjuntos ahora sí se seleccionan en el muro de /familia).
  - **White-label por escuela**: `schools.brand_color` (migración 081) + logo (052) se muestran en /escuela/[slug], /jugar y /familia (`lib/school/brand.ts`, `SchoolBrandHeader`); solo si todos los hijos son de una misma escuela. Dirección elige el color en el panel de /red (`PUT /api/school/brand`, RLS 079). Nombre de la escuela en el subject de los correos del muro.
  - **Supervisión (dirección, solo lectura)**: migración 082 — políticas SELECT para role_type=admin sobre fortnights/lesson_plans/materials/group_posts/groups de su escuela (students excluido: PII). Página `/red/supervision` consulta user-scoped (RLS = autorización real).
  - **Avisos school-wide**: se reusó `school_announcements` (010); ahora visibles en /escuela/[slug], /familia (+ página por hijo) y tarjeta en el dashboard docente (`lib/school/announcements.ts`). Sin email en v1.
  - **Solicitudes a dirección**: migración 083 `school_requests` (material/presupuesto/otro, inmutables, dirección aprueba/rechaza con respuesta). API `/api/school/requests` (+ `[id]` PATCH, guard 409), tarjeta `RequestsCard` en /red para ambos roles.

- **Flujo "¿Eres familia?" (2026-08-24)**: página pública `/familia/acceso` (cómo funciona el acceso por invitación, sin datos), link desde /login; login con email/contraseña ahora manda a padres (sin fila de teacher, con parent_link activo) a /familia igual que ya hacía el callback de Google. **Vista previa para la miss**: botón "Ver como familia" en la ficha del alumno (`POST /api/parent-links/preview`) — se auto-reclama un parent_link (revocable, visible en la lista) y abre /familia tal como lo ve el papá. Acceso sigue siendo solo por invitación de la maestra; sin dropdown de nombres (PII).

- **Friday demo prep (2026-08-25)**: (1) **School sharing fix** — `handleShareWithSchool` in materiales and diario now obtains a public play/share URL first so school recipients don't hit an auth wall. (2) **OG metadata** — `generateMetadata` added to `/jugar/[token]` and `/compartir/[token]`; WhatsApp/iMessage previews now show title + description + branded image (`public/og-game.png`, `public/og-diary.png`). (3) **Reusable `ShareSheet`** — `components/ui/ShareSheet.tsx` replaces inline modals in materiales and diario pages; supports copy, WhatsApp, native Web Share API, expiry badge, and "Renovar enlace". (4) **Admin portal expansion** — `/red/supervision` gains school-wide stat bar (planeaciones este mes, materiales, solicitudes pendientes), per-teacher diary count and requests count, and a client-side name filter (`SupervisionFilter` client component). (5) **Extension hardening** — `extension/background.js` stores failed payload in `lastFailedSync`, `retrySync()` with 3-attempt backoff; popup shows human-readable error copy and "Reintentar" button; duplicate guard skips same group+data within 30s. Extension bumped to v1.3.0.

- **Subdominios por escuela (2026-08-24)**: `<slug>.maestraia.com` (y .mx / maestraai) — el middleware reescribe la raíz al portal `/escuela/<slug>` (`lib/school/host.ts`, nombres reservados www/diario/api…); el resto de rutas funciona igual en el subdominio con el logo de la escuela en el shell. Sesión compartida entre www y subdominios vía `NEXT_PUBLIC_COOKIE_DOMAIN=.maestraia.com` (los 3 clientes supabase la respetan). **Config pendiente de Alan**: (1) dominio wildcard `*.maestraia.com` en Vercel + CNAME wildcard en DNS, (2) `NEXT_PUBLIC_COOKIE_DOMAIN` en Vercel, (3) `https://*.maestraia.com/auth/callback` en Supabase Auth → Redirect URLs (para Google en subdominios).
- **White-label v2 (2026-08-24)**: el logo de la escuela sustituye "MaestraIA" arriba a la izquierda del shell docente (`SchoolLogoBrand`, fallback al texto); `/escuela/<slug>` funciona como URL de entrada de la escuela — sin sesión redirige a `/login?next=...` y regresa (next relativo-only en email y Google), miembros no autorizados siguen viendo acceso restringido.
- **Notificaciones a familias (2026-08-24)**: (1) **Web Push** — migración 084 `push_subscriptions`, `/sw.js`, botón "Activar notificaciones" en /familia (`PushOptIn`), `lib/push/send.ts` (web-push + VAPID, poda suscripciones muertas); publicar anuncio/tarea del grupo o aviso school-wide manda push a los papás vinculados. Requiere `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (en .env.local; **faltan en Vercel** — sin ellas el push se desactiva solo). (2) **Correo para avisos school-wide**: checkbox "Enviar también por correo" en /red (solo admin/coordinación), tope 300 destinatarios, reusa el patrón de group posts. (3) **Badge "Nuevo"** en /familia (`NewBadge`/`MarkSeen`, localStorage por dispositivo) sobre posts y avisos desde la última visita.

## Pending migrations

None — everything through **083** applied (2026-08-24), types regenerated from linked project.

## What does NOT exist yet

- Report cards generator (trimestral qualitative, post-launch)
- Admin dashboard (school-admin analytics)
- Game difficulty levels (UX decision pending)
- Word Scramble / Simon Says game types
