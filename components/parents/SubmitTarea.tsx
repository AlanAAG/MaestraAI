'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Check } from 'lucide-react'

/** Family uploads the child's homework (photo/PDF) for a tarea post. */
export function SubmitTarea({ postId, studentId }: { postId: string; studentId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      setError('Archivo demasiado grande (máx 6MB).')
      return
    }
    setBusy(true)
    setError('')
    try {
      const base64 = btoa(
        new Uint8Array(await file.arrayBuffer()).reduce(
          (acc, b) => acc + String.fromCharCode(b),
          ''
        )
      )
      const res = await fetch('/api/familia/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          student_id: studentId,
          name: file.name,
          mimeType: file.type,
          base64,
        }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) throw new Error(data.error ?? 'No se pudo subir la tarea.')
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la tarea.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success-text">
        <Check size={13} /> Tarea enviada
      </span>
    )
  }
  return (
    <span>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-primary">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        Subir tarea
        <input
          type="file"
          accept=".pdf,.docx,image/jpeg,image/png,image/webp"
          onChange={upload}
          disabled={busy}
          className="hidden"
          aria-label="Subir archivo de tarea"
        />
      </label>
      {error && <span className="ml-2 text-xs text-error">{error}</span>}
    </span>
  )
}
