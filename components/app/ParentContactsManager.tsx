'use client'
import { useEffect, useRef, useState } from 'react'
import { Loader2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { progressToast } from '@/lib/ui/progress-toast'

type Contact = {
  id: string
  richmond_student_id: string
  student_first_name: string | null
  student_last_name: string | null
  parent_name: string | null
  parent_email: string
}
type Extracted = { student_name: string; parent_name: string; parent_email: string }

// Reusable parent-contact manager (AI import from pasted text or a photo, plus manual add).
// Emails are stored ENCRYPTED at rest by /api/calificaciones/contacts. Scoped to one group.
export function ParentContactsManager({ groupId }: { groupId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tab, setTab] = useState<'paste' | 'photo' | 'manual'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [extracted, setExtracted] = useState<Extracted[]>([])
  const [saving, setSaving] = useState(false)
  const [mFirst, setMFirst] = useState('')
  const [mLast, setMLast] = useState('')
  const [mParent, setMParent] = useState('')
  const [mEmail, setMEmail] = useState('')
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/calificaciones/contacts?group_id=${groupId}`)
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then((d) => setContacts(d.contacts ?? []))
      .catch(() => {})
  }, [groupId])

  async function reload() {
    const r = await fetch(`/api/calificaciones/contacts?group_id=${groupId}`)
    if (r.ok) setContacts((await r.json()).contacts ?? [])
  }

  async function extract(body: Record<string, unknown>) {
    const p = progressToast(['Leyendo los contactos…', 'Extrayendo nombres y correos…'])
    try {
      const res = await fetch('/api/calificaciones/contacts?action=extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExtracted(data.contacts ?? [])
      if ((data.contacts ?? []).length === 0) p.error('No encontré correos. Revisa el formato.')
      else p.success(`Encontré ${data.contacts.length} contactos`)
    } catch {
      p.error('No pude extraer los contactos.')
    }
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const [header, imageBase64] = dataUrl.split(',')
      const imageMimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      extract({ imageBase64, imageMimeType })
    }
    reader.readAsDataURL(file)
  }

  async function saveExtracted() {
    const valid = extracted
      .filter((c) => c.parent_email)
      .map((c) => {
        const parts = c.student_name.trim().split(' ')
        return {
          richmond_student_id: c.student_name.toLowerCase().replace(/\s+/g, '_'),
          student_first_name: parts[0] ?? '',
          student_last_name: parts.slice(1).join(' '),
          parent_name: c.parent_name || undefined,
          parent_email: c.parent_email,
        }
      })
    if (valid.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/calificaciones/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, contacts: valid }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${valid.length} contactos guardados`)
      setExtracted([])
      setPasteText('')
      reload()
    } catch {
      toast.error('No pude guardar los contactos.')
    } finally {
      setSaving(false)
    }
  }

  async function saveManual() {
    if (!mEmail || !mFirst) return
    setSaving(true)
    try {
      const res = await fetch('/api/calificaciones/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          contacts: [
            {
              richmond_student_id: `${mFirst} ${mLast}`.toLowerCase().replace(/\s+/g, '_'),
              student_first_name: mFirst || undefined,
              student_last_name: mLast || undefined,
              parent_name: mParent || undefined,
              parent_email: mEmail,
            },
          ],
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Contacto guardado')
      setMFirst('')
      setMLast('')
      setMParent('')
      setMEmail('')
      reload()
    } catch {
      toast.error('No pude guardar el contacto.')
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    await fetch(`/api/calificaciones/contacts?id=${id}`, { method: 'DELETE' })
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div>
      <div className="flex border-b text-sm">
        {(['paste', 'photo', 'manual'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 ${tab === t ? 'border-b-2 border-primary font-medium text-primary' : 'text-text-secondary'}`}
          >
            {t === 'paste' ? 'Pegar lista' : t === 'photo' ? 'Foto' : 'Manual'}
          </button>
        ))}
      </div>

      <div className="py-4 space-y-3">
        {tab === 'paste' && (
          <>
            <p className="text-xs text-text-secondary">
              Pega una lista con nombres y correos. La IA extrae los datos.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder={'Juan García - papa@gmail.com\nMaría López, mama@hotmail.com'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
            <Button
              onClick={() => extract({ pasteText })}
              disabled={!pasteText.trim()}
              className="w-full"
            >
              Extraer con IA
            </Button>
          </>
        )}

        {tab === 'photo' && (
          <>
            <p className="text-xs text-text-secondary">
              Toma una foto de tu lista de contactos. La IA extrae los correos.
            </p>
            <Button onClick={() => photoRef.current?.click()} className="w-full">
              📷 Subir foto
            </Button>
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPhoto}
            />
          </>
        )}

        {tab === 'manual' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nombre"
                value={mFirst}
                onChange={(e) => setMFirst(e.target.value)}
              />
              <Input
                placeholder="Apellido"
                value={mLast}
                onChange={(e) => setMLast(e.target.value)}
              />
            </div>
            <Input
              placeholder="Nombre del padre/madre"
              value={mParent}
              onChange={(e) => setMParent(e.target.value)}
            />
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={mEmail}
              onChange={(e) => setMEmail(e.target.value)}
            />
            <Button onClick={saveManual} disabled={!mFirst || !mEmail || saving} className="w-full">
              {saving ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
              Guardar contacto
            </Button>
          </div>
        )}

        {extracted.length > 0 && tab !== 'manual' && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">
              {extracted.length} contacto{extracted.length === 1 ? '' : 's'} encontrado
              {extracted.length === 1 ? '' : 's'}:
            </p>
            {extracted.map((c, i) => (
              <div key={i} className="text-xs border rounded p-2 bg-muted">
                <span className="font-medium">{c.student_name}</span>
                {c.parent_name && <span className="text-text-secondary"> · {c.parent_name}</span>}
                <br />
                <span className="text-primary">{c.parent_email}</span>
              </div>
            ))}
            <Button onClick={saveExtracted} disabled={saving} className="w-full">
              {saving ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
              Guardar {extracted.length} contacto{extracted.length === 1 ? '' : 's'}
            </Button>
            <button onClick={() => setExtracted([])} className="text-xs text-text-secondary w-full">
              <X size={11} className="inline mr-1" /> Limpiar
            </button>
          </div>
        )}

        {contacts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
              Contactos guardados ({contacts.length})
            </p>
            <div className="space-y-2">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between text-xs border rounded p-2 bg-muted"
                >
                  <div>
                    <span className="font-medium">
                      {[c.student_last_name, c.student_first_name].filter(Boolean).join(', ') ||
                        c.richmond_student_id}
                    </span>
                    {c.parent_name && (
                      <span className="text-text-secondary"> · {c.parent_name}</span>
                    )}
                    <br />
                    <span className="text-primary">{c.parent_email}</span>
                  </div>
                  <button
                    onClick={() => del(c.id)}
                    className="text-text-disabled hover:text-red-600 ml-2 mt-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
