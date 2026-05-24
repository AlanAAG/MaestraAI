MaestraAI — Project Context
What this is
EdTech SaaS for preschool English teachers in Mexico.
Primary persona: Alejandra, Kinder 3 teacher, Escuela Americana CDMX.
Core value: AI-powered lesson planning + observations + qualitative report cards aligned to NEM.

Current state
See @docs/PROGRESS.md for current phase, what's been built, and what's next.
After shipping any code, update @docs/PROGRESS.md before ending the session.

Stack (do not change without asking)
Next.js 14 App Router — no Pages Router, no mixing

Tailwind v3 (not v4 yet)

shadcn/ui + Inter font

Supabase: server client in Server Components, browser client in Client Components

Claude API server-side only — never client-side, always streaming

framer-motion for all UI animations

Zod on every API route input, no exceptions

Vitest, Prettier, Husky

Where things live
API routes: app/api/

Supabase clients: lib/supabase/

DB types: lib/database.types.ts

Prompts: lib/prompts/ — edit prompts here, never inline

Components: components/

Diary microsite: app/diary/

Claude API usage patterns
claude-haiku-4-5 → diary summaries, flashcards, quick validations

claude-sonnet-4-5 → lesson plans, report cards, complex generation

Always stream — never await full response, never return buffered text

Prompts live in lib/prompts/\*.ts

Environment vars
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
NEXT_PUBLIC_FORCE_DIARY_SITE (local subdomain testing)

Subdomain routing
diario.maestraai.mx → /diary/\*
Test locally with: NEXT_PUBLIC_FORCE_DIARY_SITE=true

Dev commands
Dev: npm run dev

Test: npm run test (single file only, never full suite)

Typecheck: npm run typecheck

Lint: npm run lint

DB push: supabase db push

Regen types: supabase gen types typescript --local > lib/database.types.ts

Absolute rules
Never disable RLS. Not even for debugging.

Never call Claude API from the client.

Never show blank screen during AI processing — streaming UI always.

Never numeric grades, percentages, or score-like language in any output.

Never put Letter & Number activity outside Tuesday.

Never put number-sequence work outside Thursday.

Never more than 4 fields visible at once in any form.

Always validate API inputs with Zod before touching DB or calling Claude.

Always run typecheck after modifying TypeScript files.

NEM constraints (apply to all pedagogical outputs)
Evaluation: Si / En proceso / No — qualitative observations only.
4 Campos Formativos: Lenguajes, Saberes y Pensamiento Científico,
Ética Naturaleza y Sociedades, De lo Humano y lo Comunitario.
7 Ejes Articuladores: Inclusión, Pensamiento crítico, Interculturalidad,
Igualdad de género, Vida saludable, Lectura y escritura, Artes.

Fixed weekly schedule:

Lunes: Honores, Proyecto mensual

Martes: Computación, Letter & Number ← ONLY Tuesday

Miércoles: Ed. Física, Proyecto mensual

Jueves: Cantos y Juegos, Números ← ONLY Thursday

Viernes: Cuento con papás, cierre de Proyecto mensual

Before touching any code
Read the relevant existing files first.

Check if the pattern already exists somewhere in the codebase.

If adding a new API route, copy the structure of an existing one.

If modifying DB, write a migration — never edit tables directly.
