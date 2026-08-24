'use client'
// Solicitudes a dirección: teachers file material/budget requests; dirección resolves them.
// One component for both roles — the API's role_type decides which controls render.
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { KIND_LABELS, STATUS_LABELS } from '@/lib/school/requests'

type Request = {
  id: string
  teacher_id: string
  teacher_name: string | null
  kind: string
  title: string
  body: string | null
  amount: number | null
  status: 'pending' | 'approved' | 'rejected'
  admin_response: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning-light text-warning-text',
  approved: 'bg-success-light text-success-text',
  rejected: 'bg-red-100 text-red-700',
}

export function RequestsCard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [roleType, setRoleType] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [kind, setKind] = useState('material')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [amount, setAmount] = useState('')
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/school/requests')
    if (!res.ok) return
    const data = await res.json()
    setRequests(data.requests ?? [])
    setRoleType(data.role_type ?? null)
    setMyId(data.teacher_id ?? null)
  }
  useEffect(() => {
    load()
  }, [])

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/school/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          body: body.trim() || undefined,
          amount: kind === 'budget' && amount ? Number(amount) : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar')
      setTitle('')
      setBody('')
      setAmount('')
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar')
    } finally {
      setBusy(false)
    }
  }

  async function resolve(id: string, status: 'approved' | 'rejected') {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/school/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_response: responses[id]?.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  const isAdmin = roleType === 'admin'
  const sorted = [...requests].sort((a, b) =>
    a.status === 'pending' && b.status !== 'pending'
      ? -1
      : b.status === 'pending' && a.status !== 'pending'
        ? 1
        : 0
  )

  return (
    <Card className="p-6 border-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-text-primary">Solicitudes a dirección</h2>
        {!isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : 'Nueva solicitud'}
          </Button>
        )}
      </div>
      <p className="text-xs text-text-secondary mb-4">
        {isAdmin
          ? 'Solicitudes de material y presupuesto de tu equipo docente.'
          : 'Pide material, presupuesto u otro apoyo a la dirección de tu escuela.'}
      </p>

      {showForm && !isAdmin && (
        <div className="mb-4 space-y-2 rounded-lg border border-border bg-surface p-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              aria-label="Tipo de solicitud"
              className="h-10 rounded-lg border border-border bg-card px-2 text-sm text-text-primary"
            >
              <option value="material">Material</option>
              <option value="budget">Presupuesto</option>
              <option value="other">Otro</option>
            </select>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué necesitas?"
              maxLength={200}
              className="h-10 flex-1 min-w-[180px]"
            />
            {kind === 'budget' && (
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Monto (MXN)"
                type="number"
                min={0}
                className="h-10 w-32"
              />
            )}
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Detalles (opcional)"
            maxLength={5000}
            rows={2}
          />
          <Button size="sm" onClick={submit} disabled={busy || !title.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar solicitud'}
          </Button>
        </div>
      )}
      {error && <p className="mb-2 text-xs text-error">{error}</p>}

      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary">No hay solicitudes.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-surface px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {r.title}
                    {r.amount != null && (
                      <span className="text-text-secondary"> · ${r.amount} MXN</span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {KIND_LABELS[r.kind] ?? r.kind}
                    {isAdmin && r.teacher_id !== myId && r.teacher_name
                      ? ` · ${r.teacher_name}`
                      : ''}
                    {' · '}
                    {new Date(r.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  {r.body && (
                    <p className="mt-1 whitespace-pre-line text-xs text-text-secondary">{r.body}</p>
                  )}
                  {r.admin_response && (
                    <p className="mt-1 text-xs text-text-primary">
                      <span className="font-medium">Dirección:</span> {r.admin_response}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    STATUS_STYLES[r.status]
                  }`}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
              {isAdmin && r.status === 'pending' && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    value={responses[r.id] ?? ''}
                    onChange={(e) => setResponses((s) => ({ ...s, [r.id]: e.target.value }))}
                    placeholder="Respuesta (opcional)"
                    maxLength={2000}
                    className="h-9 flex-1 min-w-[160px]"
                  />
                  <Button size="sm" onClick={() => resolve(r.id, 'approved')} disabled={busy}>
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolve(r.id, 'rejected')}
                    disabled={busy}
                  >
                    Rechazar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
