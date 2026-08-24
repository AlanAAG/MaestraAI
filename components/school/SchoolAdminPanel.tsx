'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, Trash2, Link2 } from 'lucide-react'

type Invite = {
  id: string
  email: string
  role: string
  claimed_at: string | null
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Maestra',
  admin: 'Dirección',
  coordinator: 'Coordinación',
}

/** Director tools: school portal slug + teacher-email allowlist (invitations). Admin-only. */
export function SchoolAdminPanel() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [slug, setSlug] = useState('')
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('teacher')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [hasBrandColor, setHasBrandColor] = useState(false)

  async function saveBrandColor(color: string | null) {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const res = await fetch('/api/school/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_color: color }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar')
      setHasBrandColor(!!color)
      setMsg(color ? 'Color guardado' : 'Color quitado')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  async function load() {
    const res = await fetch('/api/school/invites')
    if (!res.ok) return
    const data = await res.json()
    setInvites(data.invites ?? [])
    const s = data.school?.slug ?? null
    setSavedSlug(s)
    if (s) setSlug(s)
  }
  useEffect(() => {
    load()
    fetch('/api/school/brand')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.brand_color) {
          setBrandColor(d.brand_color)
          setHasBrandColor(true)
        }
      })
      .catch(() => {})
  }, [])

  async function saveSlug() {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const res = await fetch('/api/school/slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string; slug?: string })
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar')
      setSavedSlug(data.slug)
      setMsg('Portal guardado')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  async function invite() {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const res = await fetch('/api/school/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res
        .json()
        .catch(() => ({}) as { error?: string; emailed?: boolean; claimed?: boolean })
      if (!res.ok) throw new Error(data.error ?? 'No se pudo invitar')
      setMsg(
        data.claimed
          ? 'Cuenta existente ligada a la escuela'
          : data.emailed
            ? 'Invitación enviada por correo'
            : 'Correo agregado a la lista'
      )
      setEmail('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo invitar')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/school/invites?id=${id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  return (
    <Card className="p-6 border-2">
      <h2 className="text-sm font-semibold text-text-primary mb-1">Administración de la escuela</h2>
      <p className="text-xs text-text-secondary mb-4">
        Solo la dirección ve esta sección: el portal de la escuela y los correos con acceso.
      </p>

      {/* Portal slug */}
      <div className="mb-5">
        <label htmlFor="school-slug" className="block text-xs font-medium text-text-primary mb-1">
          Portal de la escuela
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-secondary">maestraia.com/escuela/</span>
          <Input
            id="school-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="epa"
            maxLength={31}
            className="h-10 w-36"
          />
          <Button size="sm" onClick={saveSlug} disabled={busy || !slug.trim()}>
            Guardar
          </Button>
          {savedSlug && (
            <a
              href={`/escuela/${savedSlug}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline"
            >
              <Link2 size={13} /> Abrir portal
            </a>
          )}
        </div>
      </div>

      {/* Brand color */}
      <div className="mb-5">
        <label htmlFor="brand-color" className="block text-xs font-medium text-text-primary mb-1">
          Color de la escuela
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="brand-color"
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-surface"
          />
          <Button size="sm" onClick={() => saveBrandColor(brandColor)} disabled={busy}>
            Guardar color
          </Button>
          {hasBrandColor && (
            <button
              onClick={() => saveBrandColor(null)}
              className="text-xs text-text-secondary underline"
              disabled={busy}
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {/* Invite emails */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@delamaestra.com"
          type="email"
          aria-label="Correo a invitar"
          className="h-10 flex-1 min-w-[200px]"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Rol"
          className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary"
        >
          <option value="teacher">Maestra</option>
          <option value="coordinator">Coordinación</option>
          <option value="admin">Dirección</option>
        </select>
        <Button onClick={invite} disabled={busy || !email.includes('@')}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invitar'}
        </Button>
      </div>
      {error && <p className="mb-2 text-xs text-error">{error}</p>}
      {msg && (
        <p className="mb-2 flex items-center gap-1 text-xs text-success-text">
          <Mail size={12} /> {msg}
        </p>
      )}

      {invites.length > 0 && (
        <ul className="space-y-1.5">
          {invites.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-text-primary">{i.email}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-text-secondary">{ROLE_LABELS[i.role] ?? i.role}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    i.claimed_at
                      ? 'bg-success-light text-success-text'
                      : 'bg-warning-light text-warning-text'
                  }`}
                >
                  {i.claimed_at ? 'Activa' : 'Pendiente'}
                </span>
                <button
                  onClick={() => revoke(i.id)}
                  className="cursor-pointer rounded p-1 text-text-disabled hover:bg-red-50 hover:text-red-600"
                  aria-label={`Quitar ${i.email}`}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
