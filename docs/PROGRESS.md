MaestraAI — Project Progress
Claude: update this file after every coding session before ending. Add what was built, what changed, and what's next. Keep it accurate — this is the single source of truth for project state.

Current phase: Phase 0.5 complete — Diary Microsite live
What exists
Infrastructure
Next.js 14 App Router + Tailwind v3 + shadcn/ui + Inter font

Design system tokens in place

Subdomain middleware: diario.maestraai.mx → /diary/*

Supabase: 13 tables, RLS on all tables

Dev tooling: Vitest, Prettier, Husky, typecheck script

Supabase middleware client: lib/supabase/middleware.ts

DB tables (13)
schools, teachers, groups, group_teachers, students,
vocabulary_items, fortnights, lesson_plans, materials,
teacher_observations, report_cards, teacher_diary, usage_logs

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

Run SQL migrations in Supabase SQL Editor in order: 001 → 002 → 003 → 004 → 005

Run vocabulary seed

What does NOT exist yet
Auth (teachers cannot log in)

Main app at maestraai.mx

Lesson planner

Report cards

Material generator

Richmond sync

Session log
Date	What was shipped	Files changed
2026-05-24	Phase 0 + 0.5 complete	CLAUDE.md, PENDIENTES.md, lib/supabase/middleware.ts, supabase/migrations/005_usage_logs.sql, package.json (typecheck), .gitignore
