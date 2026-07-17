'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail } from 'lucide-react'

interface LinkRow {
  id: string
  student_id: string
  status: 'activo' | 'pendiente' | 'expirado' | 'revocado'
  expires_at: string
  created_at: string
}

const STATUS_STYLE: Record<LinkRow['status'], string> = {
  activo: 'bg-success-light text-success-text',
  pendiente: 'bg-warning-light text-warning-text',
  expirado: 'bg-inset text-text-muted',
  revocado: 'bg-error-light text-error-text',
}

// Teacher invites this student's parent to a family account (email → /familia).
export function InviteFamilyCard({ studentId }: { studentId: string }) {
  const [email, setEmail] = useState('')
  const [links, setLinks] = useState<LinkRow[]>([])
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/parent-links')
      const d = await res.json()
      setLinks((d.links ?? []).filter((l: LinkRow) => l.student_id === studentId))
    } catch {}
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function invite() {
    setSending(true)
    setMsg('')
    try {
      const res = await fetch('/api/parent-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, parent_email: email.trim() }),
      })
      const d = await res.json().catch(() => null)
      if (res.ok) {
        setMsg(d?.emailed ? 'Invitación enviada ✉️' : 'Invitación creada (correo no enviado)')
        setEmail('')
        load()
      } else {
        setMsg(d?.error ?? 'No se pudo enviar la invitación')
      }
    } finally {
      setSending(false)
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/parent-links?id=${id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  return (
    <Card className="p-8 mb-6">
      <h2 className="text-xl font-semibold text-text-primary mb-1">Invitar a familia</h2>
      <p className="text-sm text-text-secondary mb-4">
        El papá o mamá recibe un correo para crear su cuenta y ver solo las tareas y los juegos que
        compartas.
      </p>
      <div className="flex gap-2 mb-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo del papá o mamá"
          className="min-h-[44px]"
        />
        <Button
          onClick={invite}
          disabled={sending || !email.includes('@')}
          className="shrink-0 min-h-[44px]"
        >
          <Mail size={16} className="mr-1" />
          {sending ? 'Enviando…' : 'Invitar'}
        </Button>
      </div>
      {msg && <p className="text-sm text-text-secondary mb-3">{msg}</p>}
      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between text-sm">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[l.status]}`}
              >
                {l.status}
              </span>
              <span className="text-text-secondary text-xs">
                {new Date(l.created_at).toLocaleDateString('es-MX')}
              </span>
              {(l.status === 'activo' || l.status === 'pendiente') && (
                <button onClick={() => revoke(l.id)} className="text-error hover:underline text-xs">
                  Revocar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
