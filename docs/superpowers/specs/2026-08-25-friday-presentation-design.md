# Friday Presentation — Feature Design

Date: 2026-08-25 | Deadline: 2026-08-28

## Scope

Four areas to ship before the school director demo on Friday:

1. School sharing fix (bug — shared links hit auth wall)
2. OG metadata for public share URLs
3. Reusable ShareSheet component
4. Admin portal expansion (director view)
5. Extension hardening (retry + better errors)

---

## 1. School Sharing Fix

**Problem:** `handleShareWithSchool()` in materiales and diario pages sets `file_url = window.location.href` — an authenticated detail page. Other teachers click "download" and hit a login wall.

**Fix:** Before posting to `POST /api/school/resources`, obtain a public URL first:

- Materials → call `POST /api/materials/[id]/play-token` → use returned `play_url`
- Diary → call `POST /api/diary/[id]/share` → use `/compartir/[token]`

**Files:** `app/(main)/materiales/[id]/page.tsx`, `app/(main)/diario/[id]/page.tsx`
**Migration:** None.

---

## 2. OG Metadata

**Problem:** `/jugar/[token]` and `/compartir/[token]` have no `generateMetadata`. WhatsApp/iMessage shows generic link.

**Fix:**

- `app/jugar/[token]/page.tsx` — add `generateMetadata` that fetches material title by token using service client; returns `openGraph: { title, description, type: 'website' }`. Use static OG image at `/og-game.png` (pre-made branded PNG, 1200×630).
- `app/compartir/[token]/page.tsx` — same pattern, diary week label.
- Add two static branded PNGs to `public/`: `og-game.png`, `og-diary.png`.

**Files:** 2 page files + 2 static images.
**Migration:** None.

---

## 3. Reusable ShareSheet

**Problem:** Share UI is inlined in every page. Inconsistent UX, no native share, no revoke.

**Component:** `components/ui/ShareSheet.tsx`

- Props: `{ url, title, whatsappText, expiresAt?: Date, onRevoke?: () => void, onRenew?: () => void }`
- UI: shadcn `<Dialog>`. Inside: copy input + copy button, WhatsApp button, native `navigator.share()` if `typeof navigator !== 'undefined' && navigator.share`. If `expiresAt` provided, show expiry badge. If `onRenew`, show "Renovar enlace" button.
- No QR code (ponytail: QR via external CDN is blocked by CSP; add when self-hosted or server-rendered).

**Replace inline modals in:**

- `app/(main)/materiales/[id]/page.tsx` — game share modal → `<ShareSheet>`
- `app/(main)/diario/[id]/page.tsx` — diary share section → `<ShareSheet>` with `expiresAt` + `onRenew`

**Files:** 1 new component, 2 page files modified.
**Migration:** None.

---

## 4. Admin Portal Expansion

**Problem:** `/red/supervision` shows static per-teacher text lists. No diarios, no requests, no stats.

**Design:**

- School-wide stat bar at top: total planeaciones this month, total materials, total open requests (3 numbers, fetched server-side).
- Per-teacher card (existing) gains: diario count, open requests count, link "Ver materiales" → filter materiales page by teacher.
- Add `teacher_diary` count query per teacher (group by `teacher_id`, count rows where `week_start >= 30 days ago`).
- Add `school_requests` pending count per teacher.
- Filter bar (client): search by teacher name (simple `input` filter on rendered list, no new fetch).

**Files:** `app/(main)/red/supervision/page.tsx` (expand server queries + UI).
**Migration:** None — all existing tables.

---

## 5. Extension Hardening

**Problem:** Failed sync is lost forever. No retry, vague error messages.

**Changes to `extension/background.js`:**

- On sync failure, store payload in `chrome.storage.local` under `lastFailedSync: { groupId, groupSlug, data, tabId, timestamp }`.
- `retrySync(payload)` — re-POSTs with 3 attempts, backoff 1s/3s/9s. On final success, clears `lastFailedSync`. On final failure, updates `lastSyncError`.
- Duplicate guard: skip if `syncTimes[groupId]` exists and `Date.now() - syncTimes[groupId] < 30000` and `data` fingerprint matches (hash first 100 chars of JSON).
- Handle `RETRY_SYNC` message from popup.

**Changes to `extension/popup.js`:**

- When `lastSyncStatus === 'error'`, render `<button id="retryBtn">Reintentar</button>` that sends `RETRY_SYNC`.
- Map HTTP status to human copy: 401/403 → "Verifica tu clave API", 5xx → "Error del servidor — reintenta en un momento", network error → "Sin conexión".

**Files:** `extension/background.js`, `extension/popup.js`.

---

## Execution Order

1. School sharing fix (~20 min)
2. OG metadata + static images (~45 min)
3. ShareSheet component (~90 min)
4. Admin portal expansion (~2 hr)
5. Extension hardening (~60 min)
