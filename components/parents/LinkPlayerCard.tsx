'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Parent enters the 6-char code their child's game profile shows, once per child. */
export function LinkPlayerCard({ studentId, childName }: { studentId: string; childName: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/familia/player-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, student_id: studentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No pude ligar el perfil.')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude ligar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-text-primary">Conectar los juegos de {childName}</p>
      <p className="mt-1 text-xs text-text-secondary">
        Cuando {childName} juega, su perfil muestra un código de 6 caracteres. Escríbelo aquí una
        sola vez para ver sus aciertos.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="ABC123"
          className="w-32 rounded-lg border border-border bg-page px-3 py-2 text-center text-lg font-bold tracking-widest uppercase text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={submit}
          disabled={saving || code.replace(/[^A-Za-z0-9]/g, '').length < 6}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Conectando…' : 'Conectar'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  )
}
