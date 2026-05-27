# MaestraAI

**EdTech SaaS for preschool English teachers in Mexico**

AI-powered lesson planning, student tracking, and classroom materials generation aligned with NEM (Nueva Escuela Mexicana) pedagogy.

---

## 🎯 What MaestraAI Does

### For Teachers

- **Lesson Planning**: Generate 10-day fortnight plans with AI (Claude Sonnet)
- **Richmond Sync**: Import student assignments and evaluations from Richmond Learning Platform
- **Student Dashboard**: Track individual student progress with qualitative evaluations
- **Material Generation**: Create flashcards, worksheets, memory games, and YouTube playlists
- **Classroom Tools**: Project flashcards on screen, play interactive games
- **PDF Exports**: Professional print-ready documents for coordinators and auditors
- **Diary**: Weekend reflection summaries with AI insights

### Built For

- **Primary persona**: Alejandra, Kinder 3 teacher, Escuela Americana CDMX
- **Grade levels**: Preschool (Kinder 1, 2, 3)
- **Language**: English instruction in Mexico
- **Pedagogy**: NEM-aligned qualitative evaluation (no numeric grades)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase CLI (for database migrations)
- Anthropic API key (Claude)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd MaestraAI

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Add your keys: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#                SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

# Run database migrations
supabase db push

# Seed vocabulary database (129 words A-Z)
psql $DATABASE_URL < supabase/seed.sql

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
MaestraAI/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Login, register, onboarding
│   ├── (main)/              # Main app (dashboard, planeaciones, alumnos)
│   │   ├── planeaciones/   # Lesson planning
│   │   ├── alumnos/        # Student dashboard
│   │   ├── richmond/       # Richmond sync & CSV import
│   │   └── materiales/     # Materials & games
│   ├── api/                # API routes
│   └── diary/              # Diary microsite (diario.maestraai.mx)
├── components/             # React components
│   ├── app/               # App-specific components
│   ├── games/             # Interactive games (Memory Match, Flashcard Projector)
│   └── ui/                # shadcn/ui base components
├── lib/                   # Utilities
│   ├── supabase/         # Supabase clients
│   ├── richmond/         # Richmond API & CSV parser
│   ├── materials/        # Material generation logic
│   └── prompts/          # Claude prompts
├── supabase/
│   └── migrations/       # Database migrations (001-008)
├── docs/                 # Documentation
│   ├── PROGRESS.md       # Current state & session log
│   ├── guides/           # Setup, testing, onboarding guides
│   └── archive/          # Completed phase summaries
└── extension/            # Richmond Chrome extension
```

---

## 🗄️ Database Schema

**17 tables** (Supabase PostgreSQL with RLS):

**Core:**

- `schools`, `teachers`, `groups`, `students`

**Lesson Planning:**

- `fortnights`, `lesson_plans`, `materials`, `vocabulary_items`

**Richmond Integration:**

- `richmond_credentials`, `richmond_sync_log`, `richmond_assignments`, `richmond_scores`

**Observations:**

- `teacher_observations`, `teacher_diary`, `report_cards`

**System:**

- `usage_logs`, `api_keys`, `group_teachers`

---

## 🔑 Key Features

### Phase 1: Auth & Richmond Sync ✅

- Email/password authentication
- 7-step onboarding wizard
- Richmond CSV import with fuzzy student matching
- Chrome extension for auto-sync

### Phase 2: Lesson Planner ✅

- AI-generated 10-day fortnight plans
- NEM alignment (4 Campos Formativos, 7 Ejes Articuladores)
- Fixed weekly schedule (Honores, Computación, Ed. Física, etc.)
- Inline editing with vocabulary autocomplete
- PDF export (multi-page professional layout)

### Phase 3: Materials & Games ✅

- AI-generated flashcards, worksheets, memory games
- YouTube video recommendations
- Printable PDFs (4 flashcards per page, cut lines)
- Interactive Memory Match game
- Projectable flashcard viewer (classroom screen)

### Phase 3 Extensions ✅

- Richmond CSV import (proper spec implementation)
- Student progress dashboard (Module D)
- Qualitative progress charts (Logrado/En proceso/Requiere apoyo)
- UX improvements (teacher-friendly Spanish)

---

## 🛠️ Tech Stack

**Frontend:**

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS v3
- shadcn/ui
- Framer Motion

**Backend:**

- Supabase (PostgreSQL + Row Level Security)
- Claude API (Anthropic) - Sonnet 4.5 & Haiku 4.5
- Edge Functions (API routes)

**PDF Generation:**

- @react-pdf/renderer

**Testing:**

- Vitest
- TypeScript strict mode

**Dev Tools:**

- Prettier
- Husky (pre-commit hooks)
- ESLint

---

## 📚 Documentation

**Essential:**

- `docs/PROGRESS.md` - **Single source of truth** for current state
- `CLAUDE.md` - Project context for AI assistance
- `docs/guides/SETUP_CHECKLIST.md` - Deployment checklist
- `docs/RICHMOND_CSV_IMPORT.md` - CSV import documentation

**Guides:**

- `docs/guides/ONBOARDING_GUIDE.md` - User onboarding flow
- `docs/guides/TESTING.md` - Testing strategy
- `docs/guides/QUICK_START_CHECKLIST.md` - Quick setup

**Archive:**

- `docs/archive/PHASE_*.md` - Completed phase summaries

---

## 🧪 Available Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Quality checks
npm run typecheck        # TypeScript compilation
npm run lint            # ESLint
npm test                # Run tests (Vitest)

# Database
supabase db push        # Run migrations
supabase gen types typescript --local > lib/database.types.ts  # Regenerate types

# Build
npm run build           # Production build
npm start               # Start production server
```

---

## 🌐 Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Optional
NEXT_PUBLIC_FORCE_DIARY_SITE=true  # Test diary subdomain locally
```

---

## 🚨 Important Rules

**Never:**

- Disable RLS on database tables
- Use numeric grades in UI (NEM pedagogy)
- Call Claude API from client-side
- Show blank screens during AI generation (always stream)
- Put Letter & Number activities outside Tuesday
- Put number-sequence work outside Thursday

**Always:**

- Validate API inputs with Zod
- Stream Claude responses to UI
- Use qualitative evaluation (Sí/En proceso/No)
- Run `npm run typecheck` after TypeScript changes
- Update `docs/PROGRESS.md` after coding sessions

---

## 📦 Deployment

**Vercel (Recommended):**

1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy (automatic on push to main)

**Database:**

1. Run migrations in Supabase SQL Editor (001 → 008)
2. Regenerate types
3. Seed vocabulary database

**Subdomain routing:**

- `diario.maestraai.mx` → `/diary/*` (via middleware)

---

## 👥 Contributing

This is a private project for Alejandra's classroom. Not currently accepting external contributions.

---

## 📄 License

Proprietary - All rights reserved

---

## 🔗 Links

- **Product Spec**: `MaestraAI_Product_Spec.md` (Desktop)
- **Session Logs**: `docs/PROGRESS.md`
- **Claude Context**: `CLAUDE.md`

---

**Built with Claude Code - May 2026**
