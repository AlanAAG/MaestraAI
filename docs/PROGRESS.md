MaestraAI — Project Progress
Claude: update this file after every coding session before ending. Add what was built, what changed, and what's next. Keep it accurate — this is the single source of truth for project state.

Current phase: Phase 2 complete — Lesson Planner
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

What does NOT exist yet
Export Word + PDF for lesson plans

Report cards generator

Material generator (flashcards, memorama, YouTube)

Session log
Date What was shipped Files changed
2026-05-24 Phase 0 + 0.5 complete CLAUDE.md, PENDIENTES.md, lib/supabase/middleware.ts, supabase/migrations/005*usage_logs.sql, package.json (typecheck), .gitignore
2026-05-24 Phase 1 Auth complete app/(auth)/*, app/(app)/onboarding/, app/(app)/layout.tsx, app/(main)/dashboard/, app/(main)/configuracion/
2026-05-24 Phase 1 Richmond Sync complete lib/richmond/_, app/api/richmond/_, app/(main)/dashboard/richmond/, extension/_, supabase/migrations/006_richmond_sync.sql, supabase/seed_step2.sql
2026-05-25 Phase 2 Lesson Planner complete app/(main)/planeaciones/_, app/api/planner/generate/route.ts, components/app/RubricEditor.tsx
