'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { Loader2, Download, Users, X, Send, Trash2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { getEditorialConfig } from '@/lib/editorial/registry'

type Group = { id: string; name: string; grade: string }
type Assignment = { id: string; title: string; due_at: string }
type Score = {
  assignment_id: string
  richmond_student_id: string
  first_name: string
  last_name: string
  total_score: number | null
  done: boolean
}
type Contact = {
  id: string
  richmond_student_id: string
  student_first_name: string | null
  student_last_name: string | null
  parent_name: string | null
  parent_email: string
}
type ExtractedContact = {
  student_name: string
  parent_name: string
  parent_email: string
  // resolved after user matches to student
  richmond_student_id?: string
}

export default function CalificacionesRichmondPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  // Contacts panel
  const [showContacts, setShowContacts] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactTab, setContactTab] = useState<'paste' | 'photo' | 'manual'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedContact[]>([])
  const [saving, setSaving] = useState(false)
  // manual entry
  const [manualStudentId, setManualStudentId] = useState('')
  const [manualFirstName, setManualFirstName] = useState('')
  const [manualLastName, setManualLastName] = useState('')
  const [manualParentName, setManualParentName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const photoRef = useRef<HTMLInputElement>(null)

  // Notify panel
  const [notifyingAssignment, setNotifyingAssignment] = useState<Assignment | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id, editorial')
        .eq('auth_id', user.id)
        .single()
      if (!teacher) return

      // Richmond-only page — bounce teachers whose editorial has no LMS sync.
      if (!getEditorialConfig(teacher.editorial).has_lms_sync) {
        window.location.href = '/dashboard'
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groupsData } = await (supabase as any)
        .from('groups')
        .select('id, name, grade')
        .eq('titular_teacher_id', teacher.id)
        .order('name')

      const list: Group[] = groupsData ?? []
      setGroups(list)
      if (list.length > 0) setSelectedGroup(list[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedGroup || !groups.find((g) => g.id === selectedGroup)) return
    loadGroupData(selectedGroup)
    loadContacts(selectedGroup)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup])

  async function loadGroupData(groupId: string) {
    setLoading(true)
    // Names are encrypted in the DB and can only be decrypted server-side.
    const res = await fetch(`/api/calificaciones/scores?group_id=${groupId}`)
    if (!res.ok) {
      setAssignments([])
      setScores([])
      setLoading(false)
      return
    }
    const { assignments: assignList, scores: scoreData } = await res.json()
    setAssignments(assignList ?? [])
    setScores(scoreData ?? [])
    setLoading(false)
  }

  async function loadContacts(groupId: string) {
    const res = await fetch(`/api/calificaciones/contacts?group_id=${groupId}`)
    if (res.ok) {
      const { contacts: data } = await res.json()
      setContacts(data ?? [])
    }
  }

  async function handleExtract() {
    if (!pasteText.trim()) return
    setExtracting(true)
    setExtracted([])
    try {
      const res = await fetch('/api/calificaciones/contacts?action=extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasteText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExtracted(data.contacts ?? [])
      if ((data.contacts ?? []).length === 0)
        toast.error('No encontré correos en el texto. Revisa el formato.')
    } catch {
      toast.error('No pude extraer contactos. Intenta de nuevo.')
    } finally {
      setExtracting(false)
    }
  }

  async function handlePhotoExtract(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    setExtracted([])
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const [header, imageBase64] = dataUrl.split(',')
      const imageMimeType = (header.match(/:(.*?);/)?.[1] ?? 'image/jpeg') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/jpg'
        | 'image/webp'
      try {
        const res = await fetch('/api/calificaciones/contacts?action=extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, imageMimeType }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setExtracted(data.contacts ?? [])
        if ((data.contacts ?? []).length === 0) toast.error('No encontré correos en la imagen.')
      } catch {
        toast.error('No pude extraer contactos de la foto.')
      } finally {
        setExtracting(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSaveExtracted() {
    // For auto-extracted contacts, we don't have richmond_student_id — save with student name only
    // Teacher can refine later via manual tab
    const validContacts = extracted
      .filter((c) => c.parent_email)
      .map((c) => {
        const nameParts = c.student_name.trim().split(' ')
        return {
          richmond_student_id: c.student_name.toLowerCase().replace(/\s+/g, '_'),
          student_first_name: nameParts[0] ?? '',
          student_last_name: nameParts.slice(1).join(' ') ?? '',
          parent_name: c.parent_name || undefined,
          parent_email: c.parent_email,
        }
      })

    if (validContacts.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/calificaciones/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: selectedGroup, contacts: validContacts }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${validContacts.length} contactos guardados`)
      setExtracted([])
      setPasteText('')
      await loadContacts(selectedGroup)
    } catch {
      toast.error('No pude guardar los contactos.')
    } finally {
      setSaving(false)
    }
  }

  function closeContacts() {
    setShowContacts(false)
    setExtracted([])
    setPasteText('')
    setContactTab('paste')
  }

  async function handleManualSave() {
    if (!manualEmail || !manualStudentId) return
    setSaving(true)
    try {
      const res = await fetch('/api/calificaciones/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup,
          contacts: [
            {
              richmond_student_id: manualStudentId,
              student_first_name: manualFirstName || undefined,
              student_last_name: manualLastName || undefined,
              parent_name: manualParentName || undefined,
              parent_email: manualEmail,
            },
          ],
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Contacto guardado')
      setManualStudentId('')
      setManualFirstName('')
      setManualLastName('')
      setManualParentName('')
      setManualEmail('')
      await loadContacts(selectedGroup)
    } catch {
      toast.error('No pude guardar el contacto.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteContact(id: string) {
    await fetch(`/api/calificaciones/contacts?id=${id}`, { method: 'DELETE' })
    setContacts((prev) => prev.filter((c) => c.id !== id))
    toast.success('Contacto eliminado')
  }

  async function handleNotify(assignment: Assignment, incompleteStudentIds: string[]) {
    setSending(true)
    try {
      const res = await fetch('/api/calificaciones/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup,
          assignment_title: assignment.title,
          due_date: assignment.due_at,
          student_ids: incompleteStudentIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(
        `${data.sent} correo${data.sent === 1 ? '' : 's'} enviado${data.sent === 1 ? '' : 's'}${data.failed ? ` (${data.failed} fallaron)` : ''}`
      )
      setNotifyingAssignment(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pude enviar los correos.')
    } finally {
      setSending(false)
    }
  }

  // Build student list from scores
  const studentMap = new Map<string, { first: string; last: string }>()
  for (const s of scores) {
    if (!studentMap.has(s.richmond_student_id)) {
      studentMap.set(s.richmond_student_id, { first: s.first_name, last: s.last_name })
    }
  }
  const students = Array.from(studentMap.entries()).sort((a, b) =>
    `${a[1].last}${a[1].first}`.localeCompare(`${b[1].last}${b[1].first}`)
  )

  const scoreKey = (assignId: string, studentId: string) =>
    scores.find((s) => s.assignment_id === assignId && s.richmond_student_id === studentId)

  function incompleteStudentsFor(assignment: Assignment) {
    return students
      .filter(([sid]) => {
        const s = scoreKey(assignment.id, sid)
        return !s || (!s.done && s.total_score == null)
      })
      .map(([sid]) => sid)
  }

  function exportCsv() {
    const headers = ['Apellido', 'Nombre', ...assignments.map((a) => a.title.slice(0, 30))]
    const rows = students.map(([sid, { first, last }]) => [
      last,
      first,
      ...assignments.map((a) => {
        const s = scoreKey(a.id, sid)
        return s ? (s.total_score ?? (s.done ? 'Entregado' : '—')) : '—'
      }),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `calificaciones-richmond-${selectedGroup}.csv`
    a.click()
  }

  const group = groups.find((g) => g.id === selectedGroup)

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Calificaciones Richmond</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Últimas 20 tareas sincronizadas por grupo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowContacts(true)} className="min-h-[44px]">
            <Users size={16} className="mr-2" />
            Contactos{contacts.length > 0 ? ` (${contacts.length})` : ''}
          </Button>
          {students.length > 0 && (
            <Button variant="outline" onClick={exportCsv} className="min-h-[44px]">
              <Download size={16} className="mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {/* Group selector */}
      {groups.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.grade})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <p className="font-medium">Sin tareas sincronizadas</p>
          <p className="text-sm mt-1">
            {group
              ? `${group.name} no tiene datos de Richmond aún.`
              : 'Sincroniza desde la extensión de Chrome.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="sticky left-0 bg-muted px-4 py-3 text-left font-semibold text-text-primary whitespace-nowrap border-r border-border">
                  Alumno
                </th>
                {assignments.map((a) => {
                  const incomplete = incompleteStudentsFor(a)
                  const canNotify = contacts.length > 0 && incomplete.length > 0
                  return (
                    <th
                      key={a.id}
                      className="px-3 py-3 text-center font-medium text-text-secondary max-w-[120px]"
                    >
                      <div className="truncate max-w-[110px]" title={a.title}>
                        {a.title}
                      </div>
                      <div className="text-xs font-normal text-text-disabled">
                        {new Date(a.due_at).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      {canNotify && (
                        <button
                          onClick={() => setNotifyingAssignment(a)}
                          className="mt-1 text-xs text-primary hover:underline flex items-center gap-0.5 mx-auto"
                          title={`Notificar ${incomplete.length} padres`}
                        >
                          <Mail size={11} />
                          {incomplete.length}
                        </button>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map(([sid, { first, last }]) => (
                <tr key={sid} className="hover:bg-muted/40">
                  <td className="sticky left-0 bg-white hover:bg-muted/40 px-4 py-2.5 font-medium text-text-primary whitespace-nowrap border-r border-border">
                    {last}, {first}
                  </td>
                  {assignments.map((a) => {
                    const s = scoreKey(a.id, sid)
                    const score = s?.total_score
                    const colorClass =
                      score == null
                        ? 'text-text-disabled'
                        : score >= 80
                          ? 'text-green-700 font-semibold'
                          : score >= 60
                            ? 'text-yellow-700'
                            : 'text-red-600'
                    return (
                      <td key={a.id} className={`px-3 py-2.5 text-center ${colorClass}`}>
                        {score != null ? score : s?.done ? '✓' : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contacts panel */}
      {showContacts && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={closeContacts} />
          <div className="relative ml-auto w-full max-w-md bg-white h-full flex flex-col shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Contactos de padres</h2>
              <button onClick={closeContacts}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b text-sm">
              {(['paste', 'photo', 'manual'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setContactTab(tab)}
                  className={`flex-1 py-2.5 ${contactTab === tab ? 'border-b-2 border-primary font-medium text-primary' : 'text-text-secondary'}`}
                >
                  {tab === 'paste' ? 'Pegar lista' : tab === 'photo' ? 'Foto' : 'Manual'}
                </button>
              ))}
            </div>

            <div className="p-5 flex-1">
              {contactTab === 'paste' && (
                <div className="space-y-3">
                  <p className="text-xs text-text-secondary">
                    Pega una lista con nombres y correos. Puede ser CSV, tabla, texto libre — la IA
                    extrae los datos.
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={6}
                    placeholder={
                      'Ejemplo:\nJuan García - papa@gmail.com\nMaría López, mama@hotmail.com'
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                  <Button
                    onClick={handleExtract}
                    disabled={!pasteText.trim() || extracting}
                    className="w-full"
                  >
                    {extracting ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
                    {extracting ? 'Extrayendo...' : 'Extraer con IA'}
                  </Button>

                  {extracted.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-medium text-text-secondary">
                        {extracted.length} contacto{extracted.length === 1 ? '' : 's'} encontrado
                        {extracted.length === 1 ? '' : 's'}:
                      </p>
                      {extracted.map((c, i) => (
                        <div key={i} className="text-xs border rounded p-2 bg-muted">
                          <span className="font-medium">{c.student_name}</span>
                          {c.parent_name && (
                            <span className="text-text-secondary"> · {c.parent_name}</span>
                          )}
                          <br />
                          <span className="text-primary">{c.parent_email}</span>
                        </div>
                      ))}
                      <Button
                        onClick={handleSaveExtracted}
                        disabled={saving}
                        className="w-full mt-2"
                      >
                        {saving ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
                        Guardar {extracted.length} contacto{extracted.length === 1 ? '' : 's'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {contactTab === 'photo' && (
                <div className="space-y-3">
                  <p className="text-xs text-text-secondary">
                    Toma una foto de tu lista de contactos impresa o en pantalla. La IA extrae los
                    correos.
                  </p>
                  <Button
                    onClick={() => photoRef.current?.click()}
                    className="w-full"
                    disabled={extracting}
                  >
                    {extracting ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
                    {extracting ? 'Extrayendo...' : '📷 Subir foto'}
                  </Button>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoExtract}
                  />

                  {extracted.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-medium text-text-secondary">
                        {extracted.length} contacto{extracted.length === 1 ? '' : 's'} encontrado
                        {extracted.length === 1 ? '' : 's'}:
                      </p>
                      {extracted.map((c, i) => (
                        <div key={i} className="text-xs border rounded p-2 bg-muted">
                          <span className="font-medium">{c.student_name}</span>
                          {c.parent_name && (
                            <span className="text-text-secondary"> · {c.parent_name}</span>
                          )}
                          <br />
                          <span className="text-primary">{c.parent_email}</span>
                        </div>
                      ))}
                      <Button
                        onClick={handleSaveExtracted}
                        disabled={saving}
                        className="w-full mt-2"
                      >
                        {saving ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
                        Guardar {extracted.length} contacto{extracted.length === 1 ? '' : 's'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {contactTab === 'manual' && (
                <div className="space-y-2">
                  <p className="text-xs text-text-secondary mb-3">
                    Agrega contactos uno por uno. El ID del alumno debe coincidir con el que usa
                    Richmond.
                  </p>
                  <Input
                    placeholder="ID alumno Richmond (requerido)"
                    value={manualStudentId}
                    onChange={(e) => setManualStudentId(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre alumno"
                      value={manualFirstName}
                      onChange={(e) => setManualFirstName(e.target.value)}
                    />
                    <Input
                      placeholder="Apellido"
                      value={manualLastName}
                      onChange={(e) => setManualLastName(e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="Nombre del padre/madre"
                    value={manualParentName}
                    onChange={(e) => setManualParentName(e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com (requerido)"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleManualSave}
                    disabled={!manualStudentId || !manualEmail || saving}
                    className="w-full mt-1"
                  >
                    {saving ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
                    Guardar contacto
                  </Button>
                </div>
              )}

              {/* Saved contacts list */}
              {contacts.length > 0 && (
                <div className="mt-6">
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
                            {[c.student_last_name, c.student_first_name]
                              .filter(Boolean)
                              .join(', ') || c.richmond_student_id}
                          </span>
                          {c.parent_name && (
                            <span className="text-text-secondary"> · {c.parent_name}</span>
                          )}
                          <br />
                          <span className="text-primary">{c.parent_email}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
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
        </div>
      )}

      {/* Notify confirmation modal */}
      {notifyingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !sending && setNotifyingAssignment(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-text-primary mb-2">Notificar padres</h3>
            <p className="text-sm text-text-secondary mb-1">
              Tarea: <strong>{notifyingAssignment.title}</strong>
            </p>
            {(() => {
              const incomplete = incompleteStudentsFor(notifyingAssignment)
              const contactedIds = contacts.map((c) => c.richmond_student_id)
              const willNotify = incomplete.filter((id) => contactedIds.includes(id))
              return (
                <>
                  <p className="text-sm text-text-secondary mb-4">
                    Se enviará un correo a los padres de{' '}
                    <strong>
                      {willNotify.length} alumno{willNotify.length === 1 ? '' : 's'}
                    </strong>{' '}
                    que aún no entregaron.
                    {incomplete.length > willNotify.length && (
                      <span className="text-amber-600">
                        {' '}
                        ({incomplete.length - willNotify.length} sin correo registrado)
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setNotifyingAssignment(null)}
                      disabled={sending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleNotify(notifyingAssignment, incomplete)}
                      disabled={sending || willNotify.length === 0}
                    >
                      {sending ? (
                        <Loader2 size={15} className="mr-2 animate-spin" />
                      ) : (
                        <Send size={15} className="mr-2" />
                      )}
                      {sending ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
