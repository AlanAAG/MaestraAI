# Friday Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five targeted improvements before the Friday school-director demo: fix school sharing links, add OG metadata for WhatsApp previews, extract a reusable ShareSheet component, expand the director supervision view, and harden the Chrome extension's sync retry flow.

**Architecture:** Each task is self-contained; no cross-task runtime dependencies. Tasks 1–3 touch the Next.js app (server + client components, no DB changes). Task 4 expands a server component with additional Supabase queries. Task 5 modifies two vanilla JS extension files.

**Tech Stack:** Next.js 14 App Router, Supabase (service + cookie clients), Tailwind v3, shadcn/ui, TypeScript (Zod on API routes), Chrome Extension Manifest V3.

**Spec:** `docs/superpowers/specs/2026-08-25-friday-presentation-design.md`

## Global Constraints

- Never disable RLS. Never call Claude API from the client.
- No new DB migrations for any task in this plan.
- Tailwind v3 (not v4). shadcn/ui components only when they already exist in the project.
- After every TypeScript change: `npm run typecheck`. After all tasks: `npm run typecheck && npm run test`.
- Conventional commits: `type(scope): description` under 72 chars.
- Never hardcode school-specific copy. Never numeric grades.
- Max 4 fields visible at once in any form.

---

## File Map

| File                                  | Action                                                                             | Task |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ---- |
| `app/(main)/materiales/[id]/page.tsx` | Modify `handleShareWithSchool` — get play token first                              | 1    |
| `app/(main)/diario/[id]/page.tsx`     | Modify `handleShareSchool` — get share token first                                 | 1    |
| `app/jugar/[token]/page.tsx`          | Add `generateMetadata` export                                                      | 2    |
| `app/compartir/[token]/page.tsx`      | Add `generateMetadata` export                                                      | 2    |
| `public/og-game.png`                  | Create static branded OG image 1200×630                                            | 2    |
| `public/og-diary.png`                 | Create static branded OG image 1200×630                                            | 2    |
| `components/ui/ShareSheet.tsx`        | Create reusable share dialog                                                       | 3    |
| `app/(main)/materiales/[id]/page.tsx` | Replace inline share modal with `<ShareSheet>`                                     | 3    |
| `app/(main)/diario/[id]/page.tsx`     | Replace inline share section with `<ShareSheet>`                                   | 3    |
| `app/(main)/red/supervision/page.tsx` | Add diary count, requests count, stats header, name filter                         | 4    |
| `lib/school/oversight.ts`             | No change — `summarizeByTeacher` is sufficient                                     | 4    |
| `extension/background.js`             | Add `lastFailedSync` storage, `retrySync()`, `RETRY_SYNC` handler, duplicate guard | 5    |
| `extension/popup.js`                  | Add retry button when `lastSyncStatus === 'error'`, better error copy              | 5    |

---

## Task 1: Fix School Sharing (school-shared links open without auth)

**Files:**

- Modify: `app/(main)/materiales/[id]/page.tsx` — `handleShareWithSchool` function
- Modify: `app/(main)/diario/[id]/page.tsx` — `handleShareSchool` function

**Interfaces:**

- Consumes: existing `POST /api/materials/[id]/play-token` → `{ play_token, play_url }`
- Consumes: existing `POST /api/diary/[id]/share` → `{ token }`
- Produces: `file_url` passed to `POST /api/school/resources` is now a public URL

**Problem:** Both handlers currently set `file_url: window.location.href` — the authenticated detail page. Recipients need to be logged in as the same teacher to open it. Fix: obtain a public URL first (play token for games, share token for diary), then use that as `file_url`.

- [ ] **Step 1: Fix `handleShareWithSchool` in materiales page**

Find `handleShareWithSchool` in `app/(main)/materiales/[id]/page.tsx`. The current implementation looks like:

```ts
async function handleShareWithSchool() {
  setSharingSchool(true)
  const res = await fetch('/api/school/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: typeLabels[material.type] ?? material.type,
      file_url: window.location.href,   // ← BUG
      resource_type: resourceTypeMap[material.type] ?? 'other',
    }),
  })
  ...
}
```

Replace with:

```ts
async function handleShareWithSchool() {
  setSharingSchool(true)
  // Get a public play URL first so school recipients don't hit an auth wall.
  let publicUrl = window.location.href
  try {
    const tokenRes = await fetch(`/api/materials/${id}/play-token`, { method: 'POST' })
    if (tokenRes.ok) {
      const { play_url } = (await tokenRes.json()) as { play_url: string }
      publicUrl = play_url
    }
  } catch {
    // fall back to current URL — better than nothing
  }
  const res = await fetch('/api/school/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: typeLabels[material.type] ?? material.type,
      file_url: publicUrl,
      resource_type: resourceTypeMap[material.type] ?? 'other',
    }),
  })
  setSharingSchool(false)
  if (res.ok) setShareSchoolSuccess(true)
  else alert('No se pudo compartir.')
}
```

- [ ] **Step 2: Fix `handleShareSchool` in diario page**

Find `handleShareSchool` in `app/(main)/diario/[id]/page.tsx`. Current:

```ts
async function handleShareSchool() {
  if (!entry) return
  const res = await fetch('/api/school/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${weekLabel(entry.week_start, entry.week_end)} — Diario`,
      file_url: window.location.href, // ← BUG
      resource_type: 'guide',
    }),
  })
  alert(res.ok ? 'Compartido con tu escuela' : 'No se pudo compartir.')
}
```

Replace with:

```ts
async function handleShareSchool() {
  if (!entry) return
  // Get a public share URL first.
  let publicUrl = window.location.href
  try {
    const shareRes = await fetch(`/api/diary/${id}/share`, { method: 'POST' })
    if (shareRes.ok) {
      const { token } = (await shareRes.json()) as { token: string }
      publicUrl = `${window.location.origin}/compartir/${token}`
    }
  } catch {
    // fall back to current URL
  }
  const res = await fetch('/api/school/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${weekLabel(entry.week_start, entry.week_end)} — Diario`,
      file_url: publicUrl,
      resource_type: 'guide',
    }),
  })
  alert(res.ok ? 'Compartido con tu escuela' : 'No se pudo compartir.')
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

1. Open any game/material detail page while logged in.
2. Click "Compartir con escuela".
3. Go to `/red` and click the shared resource's download link.
4. Verify it opens `/jugar/[token]` — not a login page.
5. Repeat for a diary entry → verify it opens `/compartir/[token]`.

- [ ] **Step 5: Commit**

```bash
git add app/\(main\)/materiales/\[id\]/page.tsx app/\(main\)/diario/\[id\]/page.tsx
git commit -m "fix(sharing): school-shared links now use public URLs instead of auth pages"
```

---

## Task 2: OG Metadata for Public Share Pages

**Files:**

- Modify: `app/jugar/[token]/page.tsx` — add `generateMetadata`
- Modify: `app/compartir/[token]/page.tsx` — add `generateMetadata`
- Create: `public/og-game.png` (1200×630 branded PNG — can be a placeholder for now)
- Create: `public/og-diary.png` (1200×630 branded PNG — can be a placeholder for now)

**Interfaces:**

- Produces: `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">` in the `<head>` of both public pages.

**Note on OG images:** Create two simple branded PNG files at 1200×630. For the Friday demo, a solid cream background with the MaestraIA wordmark and a relevant emoji is sufficient. Use any image editor or generate programmatically. Place at `public/og-game.png` and `public/og-diary.png`.

- [ ] **Step 1: Add `generateMetadata` to `/jugar/[token]/page.tsx`**

The page already fetches the material by token. Add a parallel `generateMetadata` export at the top of the file (after imports):

```ts
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('materials')
    .select('type, content->>title')
    .eq('play_token', params.token)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const title = (data as any)?.title as string | null
  const typeNames: Record<string, string> = {
    flashcards: 'Flashcards',
    memory_game: 'Memorama',
    bingo: 'Bingo',
    word_search: 'Sopa de Letras',
    matching: 'Matching',
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeName = data ? (typeNames[(data as any).type] ?? 'Juego') : 'Juego'

  return {
    title: title ? `${title} — ${typeName} | MaestraIA` : `${typeName} | MaestraIA`,
    description: 'Tu maestra de inglés te invita a practicar con este juego interactivo.',
    openGraph: {
      title: title ? `${title} — ${typeName}` : typeName,
      description: 'Tu maestra de inglés te invita a practicar con este juego interactivo.',
      images: [{ url: '/og-game.png', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title ? `${title} — ${typeName}` : typeName,
      description: 'Tu maestra de inglés te invita a practicar con este juego interactivo.',
      images: ['/og-game.png'],
    },
  }
}
```

- [ ] **Step 2: Add `generateMetadata` to `/compartir/[token]/page.tsx`**

The page already queries `teacher_diary` by `share_token`. Add before the `export default`:

```ts
import type { Metadata } from 'next'

// Reuse weekLabel — it's already defined in this file.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('teacher_diary')
    .select('week_start, week_end')
    .eq('share_token', token)
    .single()

  const label = data ? weekLabel(data.week_start, data.week_end) : 'Diario docente'

  return {
    title: `${label} — Diario | MaestraIA`,
    description: 'Tu maestra compartió el diario de esta semana contigo.',
    openGraph: {
      title: label,
      description: 'Tu maestra compartió el diario de esta semana contigo.',
      images: [{ url: '/og-diary.png', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: label,
      description: 'Tu maestra compartió el diario de esta semana contigo.',
      images: ['/og-diary.png'],
    },
  }
}
```

**Important:** `weekLabel` is defined as a plain function in `compartir/[token]/page.tsx` — the `generateMetadata` function is in the same file so it can call it directly.

- [ ] **Step 3: Create placeholder OG images**

Create two 1200×630 PNG files and place them at:

- `public/og-game.png`
- `public/og-diary.png`

Simplest approach — generate with Node from the terminal:

```bash
# If you have ImageMagick available:
convert -size 1200x630 xc:"#FDF6EC" \
  -font Arial -pointsize 72 -fill "#7C5C3E" \
  -gravity Center -annotate 0 "🎮 MaestraIA\nJuego interactivo" \
  public/og-game.png

convert -size 1200x630 xc:"#FDF6EC" \
  -font Arial -pointsize 72 -fill "#7C5C3E" \
  -gravity Center -annotate 0 "📖 MaestraIA\nDiario docente" \
  public/og-diary.png
```

If ImageMagick is not available, place any 1200×630 PNG at those paths — even a solid-color placeholder. WhatsApp will show something instead of nothing.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Verify OG tags render**

```bash
npm run dev
# In another terminal:
curl -s http://localhost:3000/jugar/SOME_VALID_TOKEN | grep -i "og:"
```

Expected: lines containing `og:title`, `og:description`, `og:image`.

- [ ] **Step 6: Commit**

```bash
git add app/jugar/\[token\]/page.tsx app/compartir/\[token\]/page.tsx public/og-game.png public/og-diary.png
git commit -m "feat(og): add OpenGraph metadata to game and diary public share pages"
```

---

## Task 3: Reusable ShareSheet Component

**Files:**

- Create: `components/ui/ShareSheet.tsx`
- Modify: `app/(main)/materiales/[id]/page.tsx` — replace inline share modal with `<ShareSheet>`
- Modify: `app/(main)/diario/[id]/page.tsx` — replace inline share section with `<ShareSheet>`

**Interfaces:**

- Produces: `ShareSheet` component with props:
  ```ts
  interface ShareSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    url: string
    title: string
    whatsappText: string
    expiresAt?: Date
    onRenew?: () => Promise<void>
  }
  ```

**Note:** The existing share modal in materiales uses `api.qrserver.com` for QR codes. The CSP blocks external resources. Remove the QR code — copy + WhatsApp covers 99% of the use case for this audience.

- [ ] **Step 1: Create `components/ui/ShareSheet.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Copy, Check, MessageCircle, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface ShareSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title: string
  whatsappText: string
  expiresAt?: Date
  onRenew?: () => Promise<void>
}

export function ShareSheet({
  open,
  onOpenChange,
  url,
  title,
  whatsappText,
  expiresAt,
  onRenew,
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const [renewing, setRenewing] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // user cancelled or not supported — fall through to copy
      }
    }
  }

  async function handleRenew() {
    if (!onRenew) return
    setRenewing(true)
    try {
      await onRenew()
    } finally {
      setRenewing(false)
    }
  }

  const expired = expiresAt && expiresAt < new Date()
  const expiryLabel = expiresAt
    ? expired
      ? 'Enlace expirado'
      : `Válido hasta ${expiresAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
    : null

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL copy row */}
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-inset text-text-secondary truncate"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-inset transition-colors cursor-pointer min-w-[80px] justify-center"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" /> ¡Listo!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar
                </>
              )}
            </button>
          </div>

          {/* Expiry badge + renew */}
          {expiryLabel && (
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-medium ${expired ? 'text-error' : 'text-text-secondary'}`}
              >
                {expiryLabel}
              </span>
              {onRenew && (
                <button
                  onClick={handleRenew}
                  disabled={renewing}
                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  {renewing ? 'Renovando…' : 'Renovar enlace'}
                </button>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button className="flex-1 gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white" asChild>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>

            {canNativeShare && (
              <Button variant="outline" onClick={handleNativeShare} className="flex-1">
                Compartir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Replace inline share modal in materiales page**

In `app/(main)/materiales/[id]/page.tsx`:

a) Add the import at the top of the file:

```ts
import { ShareSheet } from '@/components/ui/ShareSheet'
```

b) Find the inline share modal block (starts at `{/* Share modal */}` around line 1151):

```tsx
{
  /* Share modal */
}
{
  showShareModal && playUrl && (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        ...entire modal JSX...
      </div>
    </div>
  )
}
```

Replace the entire block with:

```tsx
<ShareSheet
  open={showShareModal && !!playUrl}
  onOpenChange={(open) => !open && setShowShareModal(false)}
  url={playUrl ?? ''}
  title="Compartir con alumnos"
  whatsappText={`¡A jugar! Entra aquí: ${playUrl ?? ''}`}
/>
```

c) The `showShareModal`, `playUrl`, `handleCopy`, `copied` state variables are already defined. `handleCopy` and `copied` are no longer needed in this scope after the replacement — leave them in place if they're also used elsewhere in the file; remove if not.

- [ ] **Step 3: Replace inline share section in diario page**

In `app/(main)/diario/[id]/page.tsx`:

a) Add import:

```ts
import { ShareSheet } from '@/components/ui/ShareSheet'
```

b) Add state for the dialog:

```ts
const [shareOpen, setShareOpen] = useState(false)
```

c) Replace the existing share display block (around lines 201–220):

```tsx
{
  shareUrl && (
    <div className="mb-6 p-4 rounded-xl bg-primary-light border border-primary/20">
      ...existing inline section...
    </div>
  )
}
```

With a button that opens the sheet, and the sheet itself:

```tsx
{
  /* Share sheet — opens when shareUrl is set */
}
;<ShareSheet
  open={shareOpen && !!shareUrl}
  onOpenChange={(open) => setShareOpen(open)}
  url={shareUrl ?? ''}
  title="Compartir diario"
  whatsappText={`Te comparto el diario de esta semana: ${shareUrl ?? ''}`}
  expiresAt={shareUrl ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined}
  onRenew={async () => {
    const res = await fetch(`/api/diary/${id}/share`, { method: 'POST' })
    if (res.ok) {
      const { token } = (await res.json()) as { token: string }
      setShareUrl(`${window.location.origin}/compartir/${token}`)
    }
  }}
/>
```

Update `handleShare` to also open the dialog:

```ts
async function handleShare() {
  const res = await fetch(`/api/diary/${id}/share`, { method: 'POST' })
  if (!res.ok) {
    alert('No se pudo generar el enlace.')
    return
  }
  const { token } = (await res.json()) as { token: string }
  setShareUrl(`${window.location.origin}/compartir/${token}`)
  setShareOpen(true)
}
```

And update the "Enlace" button's `onClick` to call `handleShare` if no URL yet, or open the dialog if one exists:

```tsx
<Button
  variant="outline"
  onClick={shareUrl ? () => setShareOpen(true) : handleShare}
  className="min-h-[44px] gap-2"
>
  <Share2 size={16} />
  Enlace
</Button>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Manual smoke test**

1. Open a game/material → click "Compartir con alumnos" → verify ShareSheet dialog opens with copy input + WhatsApp button. No QR code (expected).
2. Open a diary entry → click "Enlace" → verify ShareSheet opens with expiry badge and "Renovar enlace" button.
3. Click "Renovar enlace" → verify no error.
4. On mobile (or Chrome DevTools mobile emulation) → verify native share button appears.

- [ ] **Step 6: Commit**

```bash
git add components/ui/ShareSheet.tsx app/\(main\)/materiales/\[id\]/page.tsx app/\(main\)/diario/\[id\]/page.tsx
git commit -m "feat(sharing): reusable ShareSheet with native share, copy, WhatsApp, expiry"
```

---

## Task 4: Admin Portal Expansion (Director View)

**Files:**

- Modify: `app/(main)/red/supervision/page.tsx`

**What to add:**

1. Fetch `teacher_diary` counts per teacher (last 30 days) and `school_requests` pending count per teacher.
2. School-wide stat bar: planeaciones this month, total materials, pending requests.
3. Client-side teacher name filter (no new fetch).
4. Per-teacher card gains: diario count, pending requests count.

**Interfaces:**

- Consumes: existing `summarizeByTeacher` from `lib/school/oversight.ts` (unchanged).
- New queries added to the existing `Promise.all` in the server component.

**Note:** The page is `force-dynamic` and uses service client for staff names + user-scoped client for content. Keep this pattern — add new queries to the same `Promise.all`.

- [ ] **Step 1: Expand server queries**

In `app/(main)/red/supervision/page.tsx`, extend the `Promise.all` to add diary counts and requests:

```ts
const [
  { data: staff },
  { data: planes },
  { data: materiales },
  { data: posts },
  { data: diaries },
  { data: requests },
] = await Promise.all([
  service
    .from('teachers')
    .select('id, full_name, role_type')
    .eq('school_id', me.school_id)
    .order('full_name'),
  sb
    .from('fortnights')
    .select('id, teacher_id, plan_type, project_name, start_date, end_date, status')
    .order('start_date', { ascending: false })
    .limit(200),
  sb
    .from('materials')
    .select('id, teacher_id, type, content->>title, generated_at')
    .order('generated_at', { ascending: false })
    .limit(200),
  sb
    .from('group_posts')
    .select('id, teacher_id, kind, title, created_at')
    .order('created_at', { ascending: false })
    .limit(100),
  // Diary entries in the last 30 days — count per teacher
  sb
    .from('teacher_diary')
    .select('teacher_id')
    .gte('week_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  // Pending school requests (status = 'pending') — for school-wide count + per-teacher
  service
    .from('school_requests')
    .select('teacher_id, status')
    .eq('school_id', me.school_id)
    .eq('status', 'pending'),
])
```

- [ ] **Step 2: Compute derived counts**

After the `Promise.all`, add:

```ts
// Count diaries per teacher
const diaryCountByTeacher = new Map<string, number>()
for (const d of diaries ?? []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tid = (d as any).teacher_id as string
  diaryCountByTeacher.set(tid, (diaryCountByTeacher.get(tid) ?? 0) + 1)
}

// Count pending requests per teacher
const pendingRequestsByTeacher = new Map<string, number>()
for (const r of requests ?? []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tid = (r as any).teacher_id as string
  pendingRequestsByTeacher.set(tid, (pendingRequestsByTeacher.get(tid) ?? 0) + 1)
}

// School-wide stats
const now = new Date()
const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
const planesThisMonth = (planes ?? []).filter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (p: any) => p.start_date >= thisMonthStart
).length
const totalPendingRequests = (requests ?? []).length
```

- [ ] **Step 3: Add stats bar and client-side filter to the JSX**

Replace the existing `return (` block with:

```tsx
return (
  <div className="max-w-4xl mx-auto px-4 py-8">
    <div className="flex items-center justify-between mb-2">
      <h1 className="text-2xl font-semibold font-display text-text-primary">Supervisión</h1>
      <Link href="/red" className="text-sm text-text-secondary underline">
        Volver a la red
      </Link>
    </div>
    <p className="text-sm text-text-secondary mb-6">
      Vista de solo lectura del trabajo de cada maestra de tu escuela.
    </p>

    {/* School-wide stats */}
    <div className="grid grid-cols-3 gap-3 mb-8">
      {[
        { label: 'Planeaciones este mes', value: planesThisMonth },
        { label: 'Materiales y juegos', value: (materiales ?? []).length },
        { label: 'Solicitudes pendientes', value: totalPendingRequests },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="text-xs text-text-secondary mt-1">{label}</p>
        </div>
      ))}
    </div>

    {/* Teacher filter — client-side via hidden attribute trick in a server component */}
    <SupervisionFilter
      staff={staff ?? []}
      summaries={summaries}
      byTeacher={byTeacher}
      diaryCountByTeacher={Object.fromEntries(diaryCountByTeacher)}
      pendingRequestsByTeacher={Object.fromEntries(pendingRequestsByTeacher)}
      fmt={fmt}
    />
  </div>
)
```

- [ ] **Step 4: Create `SupervisionFilter` client component**

Since the server component needs a client-side search input, extract the teacher list into a small client component **in the same file** using `'use client'` at the top of a separate small file:

Create `app/(main)/red/supervision/SupervisionFilter.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { TYPE_LABELS } from '@/lib/parents/child-data'

interface StaffRow {
  id: string
  full_name: string
  role_type: string
}
interface Summary {
  teacherId: string
  planes: unknown[]
  materiales: unknown[]
  posts: unknown[]
}

interface Props {
  staff: StaffRow[]
  summaries: Summary[]
  byTeacher: Record<string, Summary>
  diaryCountByTeacher: Record<string, number>
  pendingRequestsByTeacher: Record<string, number>
  fmt: (d: string | null) => string
}

export function SupervisionFilter({
  staff,
  byTeacher,
  diaryCountByTeacher,
  pendingRequestsByTeacher,
  fmt,
}: Props) {
  const [query, setQuery] = useState('')
  const filtered = staff.filter((t) => t.full_name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <input
        type="search"
        placeholder="Buscar maestra…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-border px-4 py-2 text-sm bg-card"
      />

      {filtered.map((t) => {
        const s = byTeacher[t.id]
        const diaryCount = diaryCountByTeacher[t.id] ?? 0
        const pendingReqs = pendingRequestsByTeacher[t.id] ?? 0
        return (
          <section key={t.id} className="rounded-xl border-2 border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary">{t.full_name}</h2>
                <p className="text-xs text-text-secondary">
                  {t.role_type === 'admin'
                    ? 'Dirección'
                    : t.role_type === 'coordinator'
                      ? 'Coordinación'
                      : 'Docente'}
                </p>
              </div>
              {/* Quick counts */}
              <div className="flex gap-3 text-center">
                <div>
                  <p className="text-sm font-bold text-text-primary">{s?.planes.length ?? 0}</p>
                  <p className="text-[10px] text-text-secondary">Planes</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{s?.materiales.length ?? 0}</p>
                  <p className="text-[10px] text-text-secondary">Juegos</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{diaryCount}</p>
                  <p className="text-[10px] text-text-secondary">Diarios</p>
                </div>
                {pendingReqs > 0 && (
                  <div>
                    <p className="text-sm font-bold text-warning">{pendingReqs}</p>
                    <p className="text-[10px] text-text-secondary">Solicitudes</p>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
              Planeaciones ({s?.planes.length ?? 0})
            </h3>
            {s?.planes.length ? (
              <ul className="mb-3 space-y-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(s.planes as any[]).slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary truncate">
                      {p.project_name ?? p.plan_type}
                    </span>
                    <span className="shrink-0 text-xs text-text-secondary">
                      {fmt(p.start_date)} – {fmt(p.end_date)}
                      {p.status ? ` · ${p.status}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-text-secondary">Sin planeaciones.</p>
            )}

            <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
              Materiales y juegos ({s?.materiales.length ?? 0})
            </h3>
            {s?.materiales.length ? (
              <ul className="mb-3 space-y-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(s.materiales as any[]).slice(0, 6).map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary truncate">
                      {m.title ?? TYPE_LABELS[m.type] ?? m.type}
                    </span>
                    <span className="shrink-0 text-xs text-text-secondary">
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-text-secondary">Sin materiales.</p>
            )}

            <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
              Anuncios del grupo ({s?.posts.length ?? 0})
            </h3>
            {s?.posts.length ? (
              <ul className="space-y-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(s.posts as any[]).slice(0, 4).map((g) => (
                  <li key={g.id} className="text-sm text-text-primary truncate">
                    {g.kind === 'tarea' ? '📝' : '📣'} {g.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">Sin anuncios.</p>
            )}
          </section>
        )
      })}

      {filtered.length === 0 && (
        <p className="text-center text-sm text-text-secondary py-8">
          Sin resultados para "{query}".
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Update supervision/page.tsx imports**

In `app/(main)/red/supervision/page.tsx`, add:

```ts
import { SupervisionFilter } from './SupervisionFilter'
```

And convert `byTeacher` from `Map` to plain object for serialization across server→client boundary:

```ts
// Change from:
const byTeacher = new Map(summaries.map((s) => [s.teacherId, s]))
// To:
const byTeacherMap = new Map(summaries.map((s) => [s.teacherId, s]))
const byTeacher = Object.fromEntries(byTeacherMap)
```

Also keep `fmt` as a serializable value — since it's passed to a client component, convert it to a serializable form. **Actually**, `fmt` is a function and cannot be serialized as a prop to a client component. Move `fmt` into `SupervisionFilter.tsx` directly (it only uses the date formatting logic, no server-side deps):

In `SupervisionFilter.tsx` add:

```ts
function fmt(d: string | null): string {
  return d
    ? new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    : ''
}
```

Remove `fmt` from `Props` and from the server component's prop passing.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Manual smoke test**

1. Log in as a director (`role_type = 'admin'`) and navigate to `/red/supervision`.
2. Verify the 3-stat bar appears at top (Planeaciones este mes, Materiales y juegos, Solicitudes pendientes).
3. Verify the search input filters teachers by name.
4. Verify per-teacher cards show Planes / Juegos / Diarios counts.
5. Verify a teacher with pending school_requests shows a count in amber.

- [ ] **Step 8: Commit**

```bash
git add app/\(main\)/red/supervision/page.tsx app/\(main\)/red/supervision/SupervisionFilter.tsx
git commit -m "feat(admin): director supervision view with stats, diarios count, name filter"
```

---

## Task 5: Extension Hardening (Retry + Better Errors)

**Files:**

- Modify: `extension/background.js`
- Modify: `extension/popup.js`

**Interfaces:**

- New `chrome.storage.local` key: `lastFailedSync: { groupId, groupSlug, data, timestamp } | null`
- New message type: `RETRY_SYNC` (popup → background, no payload needed)
- Error copy map (HTTP status → human string) lives in `popup.js`

- [ ] **Step 1: Add `lastFailedSync` storage and `retrySync` to `background.js`**

After the `handleAssignmentScores` function (at the end of the file, line ~128), add:

```js
// Retry a previously failed sync. Called by the RETRY_SYNC message handler.
async function retrySync() {
  const { lastFailedSync } = await chrome.storage.local.get('lastFailedSync')
  if (!lastFailedSync) return { ok: false, error: 'no pending sync' }

  const { groupId, groupSlug, data, tabId } = lastFailedSync
  const delays = [1000, 3000, 9000]

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, delays[attempt - 1]))
    try {
      const { apiKey } = await chrome.storage.sync.get('apiKey')
      if (!apiKey) return { ok: false, error: 'no_key' }
      const targetUrl = await getApiUrl()
      const response = await fetch(`${targetUrl}/api/richmond/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ group_id: groupId, data }),
      })
      if (response.ok) {
        await chrome.storage.local.remove('lastFailedSync')
        chrome.action.setBadgeText({ text: '' })
        const syncTimes = (await chrome.storage.sync.get('syncTimes')).syncTimes || {}
        syncTimes[groupId] = new Date().toISOString()
        await chrome.storage.sync.set({
          syncTimes,
          lastSyncStatus: 'ok',
          lastSyncTime: new Date().toISOString(),
          lastSyncGroup: groupSlug,
        })
        notifyTab(tabId, { type: 'SYNC_STATUS', status: 'ok', groupSlug })
        return { ok: true }
      }
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: `HTTP ${response.status}` } // don't retry auth errors
      }
    } catch {
      // network error — retry
    }
  }
  return { ok: false, error: 'max_retries' }
}
```

- [ ] **Step 2: Store failed payload and add `RETRY_SYNC` handler**

In `handleAssignmentScores`, in the HTTP error branch (around line 103), after setting `lastSyncError`, add:

```js
// Store payload so the user can retry from the popup
await chrome.storage.local.set({
  lastFailedSync: {
    groupId,
    groupSlug,
    data,
    tabId: tabId ?? null,
    timestamp: new Date().toISOString(),
  },
})
```

In the `catch` branch (line ~114), add the same after setting `lastSyncError`:

```js
await chrome.storage.local.set({
  lastFailedSync: {
    groupId,
    groupSlug,
    data,
    tabId: tabId ?? null,
    timestamp: new Date().toISOString(),
  },
})
```

In the `chrome.runtime.onMessage.addListener` block, add a new handler:

```js
} else if (message.type === 'RETRY_SYNC') {
  retrySync().then(sendResponse)
  return true
}
```

- [ ] **Step 3: Add duplicate guard to `handleAssignmentScores`**

At the start of `handleAssignmentScores`, before the API key check, add:

```js
// Deduplicate: skip if we synced this group in the last 30s with identical data
const syncTimes = (await chrome.storage.sync.get('syncTimes')).syncTimes || {}
const lastSync = syncTimes[groupId]
if (lastSync) {
  const ageMs = Date.now() - new Date(lastSync).getTime()
  const fingerprint = JSON.stringify(data).slice(0, 200)
  const { lastSyncFingerprint } = await chrome.storage.local.get('lastSyncFingerprint')
  if (ageMs < 30000 && lastSyncFingerprint === fingerprint) {
    console.log('[MaestraIA] Skipping duplicate sync for', groupId)
    return
  }
}
// Store fingerprint before proceeding
const fingerprint = JSON.stringify(data).slice(0, 200)
await chrome.storage.local.set({ lastSyncFingerprint: fingerprint })
```

- [ ] **Step 4: Add retry button and better error copy to `popup.js`**

Find `showLastSyncStatus` (or the equivalent function that reads `lastSyncStatus` from storage and renders status rows). Read it:

```js
// In popup.js, find where lastSyncStatus is read and displayed.
// Typically in a function like showLastSyncStatus() or inside DOMContentLoaded.
```

After showing the error status row, add a retry button when status is `'error'`:

```js
// In the section that renders status rows, after showing the error:
if (status === 'error') {
  // Human-readable error copy
  const errorMessages = {
    'HTTP 401': 'Verifica tu clave API',
    'HTTP 403': 'Sin autorización — verifica tu clave API',
    'HTTP 500': 'Error del servidor — reintenta en un momento',
    'HTTP 503': 'Servicio no disponible — reintenta en un momento',
    max_retries: 'No se pudo conectar tras 3 intentos',
  }
  const rawError = syncData.lastSyncError || ''
  const humanError =
    errorMessages[rawError] ||
    (rawError.startsWith('HTTP 5') ? 'Error del servidor' : rawError || 'Error desconocido')
  container.appendChild(statusRow('Error', humanError, { valueColor: '#ef4444' }))

  const retryBtn = document.createElement('button')
  retryBtn.className = 'link-btn'
  retryBtn.style.marginTop = '8px'
  retryBtn.textContent = 'Reintentar sincronización'
  retryBtn.onclick = async () => {
    retryBtn.textContent = 'Reintentando…'
    retryBtn.disabled = true
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'RETRY_SYNC' }, (response) => {
        void chrome.runtime.lastError
        resolve(response)
      })
    })
    if (result?.ok) {
      retryBtn.textContent = '¡Sincronizado!'
      retryBtn.style.background = '#22c55e'
    } else {
      retryBtn.textContent = 'No se pudo — revisa tu conexión'
      retryBtn.disabled = false
    }
  }
  container.appendChild(retryBtn)
}
```

- [ ] **Step 5: Manual smoke test**

1. Temporarily change the API URL in `chrome.storage.sync` to an invalid URL to trigger a sync failure.
2. Open a Richmond markbook page — extension intercepts, fails, badge shows `!`.
3. Open the popup — verify the error message is human-readable and "Reintentar sincronización" button appears.
4. Click retry — verify it attempts again and shows success/failure state.
5. Restore the correct API URL and verify a real sync still works end-to-end.

- [ ] **Step 6: Rebuild extension zip**

```bash
cd extension
zip -r maestraia-sync-1.3.0.zip manifest.json popup.html popup.js background.js content.js inject.js icon16.png icon48.png icon128.png
cd ..
```

- [ ] **Step 7: Commit**

```bash
git add extension/background.js extension/popup.js extension/maestraia-sync-1.3.0.zip
git commit -m "feat(extension): sync retry with backoff, duplicate guard, human error copy"
```

---

## Final Acceptance

- [ ] `npm run typecheck` — no errors
- [ ] `npm run test` — no regressions
- [ ] Manually verify all 5 areas work in a running dev server
- [ ] Update `docs/PROGRESS.md` with what was shipped
- [ ] State: **ship** or **no-ship**
