MaestraAI — Project Progress
Claude: update this file after every coding session before ending. Add what was built, what changed, and what's next. Keep it accurate — this is the single source of truth for project state.

Current phase: Phase 2.5 in progress — Multi-Tenant & Per-User API Keys
What exists
Infrastructure
Next.js 14 App Router + Tailwind v3 + shadcn/ui + Inter font

Design system tokens in place

Subdomain middleware: diario.maestraai.mx → /diary/\*

Supabase: 13 tables, RLS on all tables

Dev tooling: Vitest, Prettier, Husky, typecheck script

Supabase middleware client: lib/supabase/middleware.ts

DB tables (17)
schools, teachers, groups, group_teachers, students,
vocabulary_items, fortnights, lesson_plans, materials,
teacher_observations, report_cards, teacher_diary, usage_logs,
richmond_credentials, richmond_sync_log, richmond_assignments, richmond_scores

Seeded data
129 vocabulary words in vocabulary_items

Diary microsite (diario.maestraai.mx)
/ — landing page: hero, 3 feature cards, privacy note

/nueva — 5-step wizard, framer-motion animations, localStorage autosave, ⌘+Enter nav

/resultado — streams Claude summary (4 loading states), PDF download, "Guardar en MaestraAI" CTA

Streaming API route: app/api/diary/summarize

PDF generation API route: app/api/diary/pdf

Both routes use Zod validation

To go live
Add .env.local values (Supabase URL/keys + Anthropic API key)

Deploy to Vercel

Run SQL migrations in Supabase SQL Editor in order: 001 → 002 → 003 → 004 → 005 → 006

After migration 006, regenerate types: supabase gen types typescript --local > types/database.ts

Run vocabulary seed

Richmond Sync (Phase 1)
Richmond API client with rate limiting and session management

Crypto helpers for encrypting/decrypting Richmond session cookies

Sync service with student matching (by richmond_student_id or name fuzzy match)

API routes: /api/richmond/sync, /api/richmond/ingest, /api/richmond/upload-xlsx

Chrome Extension for auto-sync from richmondlp.com

Dashboard UI at /dashboard/richmond (tabs, stats, assignments table)

Migration 006_richmond_sync.sql (4 new tables)

Auth & Main App (Phase 1)
Login/register pages (email + password only)

Onboarding wizard (3 questions: name, grade, editorial)

Main app layout with sidebar navigation

Dashboard with zero-state and Richmond sync status

Configuration page (profile settings, Richmond sync instructions)

Lesson Planner (Phase 2)
Fortnights list view at /planeaciones with zero-state

New fortnight form at /planeaciones/nueva (Zod validation)

Fortnight detail view at /planeaciones/[id] with expandable 10-day schedule

Streaming AI generation endpoint at /api/planner/generate (Claude Sonnet 4.5)

RubricEditor component for qualitative evaluation (Sí/En proceso/No)

Integrated NEM alignment (4 Campos Formativos, 7 Ejes Articuladores)

Fixed weekly schedule constraints enforced

NEE student reminders and observation day tracking

Multi-Tenant & Per-User API Keys (Phase 2.5 - COMPLETE)
Migration 007_multi_tenant_setup.sql - Adds api_keys table, richmond_group_slug, teacher-scoped vocabulary, grade/editorial fields

API key utilities (lib/api-keys.ts) - generateApiKey, hashApiKey, verifyApiKey with bcrypt

API key management routes:

- GET /api/keys - List teacher's API keys
- POST /api/keys - Generate new key (returns plaintext once)
- DELETE /api/keys - Revoke key (soft delete via revoked_at)

Richmond groups endpoint (GET /api/richmond/groups) - Returns teacher's groups for extension auto-discovery

Updated /api/richmond/ingest - Now validates per-user API keys instead of shared token, verifies group ownership

Auth guard added to /(main) layout - Prevents unauthenticated access to dashboard/planeaciones/configuracion

Enhanced 7-step onboarding wizard:

- Name, grade, editorial (saved to teachers table)
- School selection/creation (SchoolSelector, SchoolCreator components)
- Group creation (GroupCreator component)
- API key generation (ApiKeyDisplay component)
- Confirmation screen

Settings expansion with 4 sections:

- Profile: edit name, view email
- School: view school details
- Group Management: CRUD interface (GroupList, GroupEditor, StudentRoster components)
- Richmond Integration: API key manager, test connection (ApiKeyManager component)

Dynamic group selection in planeaciones - Removed hardcoded UUID, loads teacher's groups

Extension auto-discovery:

- content.js fetches GROUP_UUID_MAP from /api/richmond/groups
- popup.js shows connection status, teacher name, group count
- Test connection button validates API key

Material Generation System (Phase 3+5 - COMPLETE)
AI-powered material generation with Claude Haiku for fast generation:

- Flashcards: vocabulary cards with definitions, examples, color coding
- Worksheets: tracing, matching, coloring activities
- Memory Games (Memorama): matching pairs with visual hints
- YouTube Recommendations: curated video suggestions by topic

Implementation:

- prompts/materials.ts - Four specialized prompts for each material type
- lib/materials/\* - Builder functions (flashcards.ts, worksheets.ts, games.ts, youtube.ts)
- POST /api/materials/generate - Validates auth, extracts vocabulary, generates sequentially
- MaterialGenerator component - Modal UI with checkboxes, progress tracking, error handling
- Checkbox component (components/ui/checkbox.tsx) - Simple checkbox without Radix dependency
- Integrated into lesson plan detail page with "Generar Materiales" button per day

Materials stored in existing materials table with proper JSONB content structure and is_projectable flag.

Planeaciones Features (Phase 3 - COMPLETE)
UI/UX Improvements:

- Skeleton loading states (no more "Cargando..." text)
- Error handling with friendly messages and retry buttons
- Form validation with inline error messages per field
- Visual card grouping for related fields
- Accessibility (WCAG AAA, keyboard nav, ARIA labels)
- Smooth animations with framer-motion
- Icons for visual scanning (BookOpen, Eye, Heart, etc.)

PDF Export:

- Multi-page planeacion PDFs (cover + 10 lesson pages)
- Professional layout with NEM alignment badges
- Color-coded methodology blocks
- Flashcard PDFs (4 per page, front/back, cut lines)
- Worksheet PDFs (tracing, matching, writing activities)
- Game card PDFs (memory match pairs, printable)
- API: POST /api/planner/pdf, POST /api/materials/export

Lesson Plan Editing:

- Inline editor for blocks, vocabulary, materials
- Vocabulary autocomplete from 129-word database
- Student observations and NEE reminders management
- Optimistic UI updates with toast notifications
- API: PATCH /api/planner/update

Material Generation:

- AI-powered with Claude Haiku (fast generation)
- Flashcards: vocabulary with definitions, colors, sentences
- Worksheets: tracing, matching, writing activities
- Memory Games: matching pairs with visual hints
- YouTube: curated video recommendations by topic
- Modal UI with progress tracking
- API: POST /api/materials/generate

Interactive Games:

- Memory Match game with card flip animations
- Full-screen projector mode
- ESC key exit, completion screen
- Progress tracking (pairs found)
- Route: /materiales/[id]/jugar

Richmond CSV Import System (Phase 2.5 Extension - COMPLETE)
Complete CSV/Excel import workflow for Richmond markbook data:

- lib/richmond/csv-parser.ts - Parser with flexible column detection, fuzzy name matching (Levenshtein distance)
- POST /api/richmond/parse-csv - Upload, validate, parse CSV/XLSX, match students to groups
- POST /api/richmond/import-batch - Batch import with transaction handling, sync log creation
- /richmond/subir - Upload UI with drag-drop, file validation, preview screen, group breakdown
- matchStudents() - Fuzzy matching algorithm with >60% confidence threshold
- Supports CSV, XLS, XLSX up to 5MB
- Shows preview: total students/assignments, matched/unmatched breakdown by group
- Test coverage: lib/richmond/**tests**/csv-parser.test.ts (4 tests passing)
- Dependencies: fastest-levenshtein for fuzzy matching, xlsx already installed
- Updated dashboard with "Importar CSV" button linking to new flow

Projectable Flashcard Viewer (Phase 3 Extension - COMPLETE)
Full-screen classroom proyector interface for flashcards:

- /materiales/[id]/proyectar - Proyector page with fullscreen support
- FlashcardProjector component - Card flip animations, auto-advance, keyboard navigation
- ProjectorControls component - Bottom control bar with nav, progress, settings
- Large text (96px word, 44px definition, 40px example) for 2m+ viewing distance
- Keyboard shortcuts: Space (flip), Arrows (nav), A (auto-advance), ESC (exit)
- Auto-advance with configurable delay (2-5s)
- Progress indicator and timeline
- Color-coded by vocabulary color
- Fullscreen API integration

UX Improvements for Teacher Perspective (Phase 3 Extension - COMPLETE)
Teacher-friendly language changes across planeaciones:

- "Nueva Planeación" → "Crear Planeación" / "Crear mi primera planeación"
- "Generar Planeación" → "Crear mi planeación"
- "Generar Materiales" → "Crear materiales"
- "Exportar PDF" → "Descargar PDF"
- "Editar" → "Modificar"
- Error messages now use natural language ("No encontré tu perfil" vs "No se encontró tu perfil de maestra")
- Progress messages more personal ("Creando tu planeación..." vs "Generando...")
- Zero state copy more encouraging and direct

Student Progress Dashboard (Phase 3 Extension - COMPLETE)
Complete Module D implementation for student tracking:

- /alumnos/page.tsx - Student list view with search and group filters
- /alumnos/[id]/page.tsx - Student detail page with progress charts and history
- StudentProgressChart component - Bar chart showing qualitative progress distribution + timeline view
- StudentScoreTable component - Sortable table with CSV export functionality
- GET /api/students/[id]/progress - Progress data endpoint with fortnight aggregation
- POST /api/students/[id]/report - Trimestral report generator for auditorías
- Proper NEM alignment (qualitative labels only, no numeric grades visible)
- Export to CSV functionality for record keeping

What does NOT exist yet
Export Word for lesson plans (optional, low priority)

Report cards generator (next phase)

Diary integration into main app (currently isolated subdomain)

Session log
Date What was shipped Files changed
2026-05-24 Phase 0 + 0.5 complete CLAUDE.md, PENDIENTES.md, lib/supabase/middleware.ts, supabase/migrations/005*usage_logs.sql, package.json (typecheck), .gitignore
2026-05-24 Phase 1 Auth complete app/(auth)/*, app/(app)/onboarding/, app/(app)/layout.tsx, app/(main)/dashboard/, app/(main)/configuracion/
2026-05-24 Phase 1 Richmond Sync complete lib/richmond/_, app/api/richmond/_, app/(main)/dashboard/richmond/, extension/_, supabase/migrations/006_richmond_sync.sql, supabase/seed_step2.sql
2026-05-25 Phase 2 Lesson Planner complete app/(main)/planeaciones/_, app/api/planner/generate/route.ts, components/app/RubricEditor.tsx
2026-05-27 Phase 3 complete - PDF Export, Editing, Materials, Games. Files: app/(main)/planeaciones/*.tsx (UI improvements), lib/*PdfDocument.tsx (5 PDF generators), app/api/planner/pdf|update (export + editing APIs), app/api/materials/export|generate (material APIs), components/games/_, components/app/LessonPlanEditor.tsx, components/app/MaterialGenerator.tsx, lib/materials/_, prompts/materials.ts, supabase/migrations/008_lesson_plan_vocabulary.sql
2026-05-27 Richmond CSV Import System complete - lib/richmond/csv-parser.ts, app/api/richmond/parse-csv|import-batch, app/(main)/richmond/subir/page.tsx, lib/richmond/**tests**/csv-parser.test.ts (4 passing tests), installed fastest-levenshtein, updated dashboard/richmond/page.tsx with Import button
2026-05-27 Phase 3 Extensions complete - Projectable flashcard viewer (app/(main)/materiales/[id]/proyectar, components/games/FlashcardProjector.tsx, ProjectorControls.tsx), Student Dashboard Module D (app/(main)/alumnos/_, app/api/students/[id]/_, StudentProgressChart.tsx, StudentScoreTable.tsx), UX improvements for teacher perspective (natural Spanish, personal pronouns, encouraging copy)
