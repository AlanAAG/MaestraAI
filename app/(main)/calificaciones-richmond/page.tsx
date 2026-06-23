'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Download, Users, X, Send, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type Group = { id: string; name: string; grade: string }
type Assignment = {
  id: string
  group_id: string
  title: string
  due_at: string
  total_students: number
  total_submitted: number
}
type Student = {
  id: string | null // students.id when linked (drill-down to /alumnos/[id])
  key: string
  first: string
  last: string
  group_id: string
  submitted: Record<string, boolean> // assignment_id -> done
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
  richmond_student_id?: string
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

export default function CalificacionesRichmondPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filter, setFilter] = useState<'all' | string>('all') // 'all' or a group id
  const [view, setView] = useState<'tarea' | 'alumno'>('tarea')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Contacts panel
  const [showContacts, setShowContacts] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactTab, setContactTab] = useState<'paste' | 'photo' | 'manual'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedContact[]>([])
  const [saving, setSaving] = useState(false)
  const [manualStudentId, setManualStudentId] = useState('')
  const [manualFirstName, setManualFirstName] = useState('')
  const [manualLastName, setManualLastName] = useState('')
  const [manualParentName, setManualParentName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const photoRef = useRef<HTMLInputElement>(null)

  // Notify
  const [notifyingAssignment, setNotifyingAssignment] = useState<Assignment | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadData(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function loadData(groupFilter: 'all' | string) {
    setLoading(true)
    setExpandedTask(null)
    const res = await fetch(`/api/calificaciones/scores?group_id=${groupFilter}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setGroups(data.groups ?? [])
    setAssignments(data.assignments ?? [])
    setStudents(data.students ?? [])
    setLoading(false)
    // Contacts are per-group; only load when a single group is selected.
    if (groupFilter !== 'all') loadContacts(groupFilter)
    else setContacts([])
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
    if (filter === 'all') return
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
        body: JSON.stringify({ group_id: filter, contacts: validContacts }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${validContacts.length} contactos guardados`)
      setExtracted([])
      setPasteText('')
      await loadContacts(filter)
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
    if (!manualEmail || !manualStudentId || filter === 'all') return
    setSaving(true)
    try {
      const res = await fetch('/api/calificaciones/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: filter,
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
      await loadContacts(filter)
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

  // Pending students for a task = roster of that task's group who didn't submit.
  function pendingStudents(a: Assignment) {
    return students.filter((s) => s.group_id === a.group_id && !s.submitted[a.id])
  }

  // Match pending students to saved contacts by NAME (Richmond's id is per-assignment, so we
  // can't match on it). Returns the contacts' richmond_student_ids the notify route expects.
  async function handleNotify(a: Assignment) {
    setSending(true)
    try {
      const contactByName = new Map(
        contacts.map((c) => [
          norm(`${c.student_first_name ?? ''} ${c.student_last_name ?? ''}`),
          c.richmond_student_id,
        ])
      )
      const ids = pendingStudents(a)
        .map((s) => contactByName.get(norm(`${s.first} ${s.last}`)))
        .filter((x): x is string => !!x)
      if (ids.length === 0) {
        toast.error('Ningún padre con correo registrado entre los pendientes.')
        return
      }
      const res = await fetch('/api/calificaciones/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: a.group_id,
          assignment_title: a.title,
          due_date: a.due_at,
          student_ids: ids,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Correos enviados a ${ids.length} familias`)
      setNotifyingAssignment(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pude enviar los correos.')
    } finally {
      setSending(false)
    }
  }

  function openStudent(s: Student) {
    if (s.id) router.push(`/alumnos/${s.id}`)
    else toast.error('Este alumno aún no está vinculado. Vuelve a sincronizar el grupo.')
  }

  // ── derived ──
  const assignmentsAsc = [...assignments].sort((a, b) => a.due_at.localeCompare(b.due_at))
  const assignmentsDesc = [...assignments].sort((a, b) => b.due_at.localeCompare(a.due_at))
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? ''

  // per-student completion (submitted / total assignments in their group)
  function completion(s: Student) {
    const total = assignments.filter((a) => a.group_id === s.group_id).length
    const done = assignments.filter((a) => a.group_id === s.group_id && s.submitted[a.id]).length
    return { done, total }
  }

  function exportCsv() {
    const headers = [
      'Apellido',
      'Nombre',
      'Grupo',
      ...assignmentsDesc.map((a) => a.title.slice(0, 30)),
    ]
    const rows = students.map((s) => [
      s.last,
      s.first,
      groupName(s.group_id),
      ...assignmentsDesc.map((a) => (s.submitted[a.id] ? 'Entregado' : '—')),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `calificaciones-richmond.csv`
    a.click()
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Calificaciones Richmond</h1>
          <p className="text-sm text-text-secondary mt-0.5">Entregas por tarea y por alumno</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowContacts(true)}
            className="min-h-[44px]"
            disabled={filter === 'all'}
            title={filter === 'all' ? 'Selecciona un grupo para gestionar contactos' : undefined}
          >
            <Users size={16} className="mr-2" />
            Contactos{contacts.length > 0 ? ` (${contacts.length})` : ''}
          </Button>
          {students.length > 0 && (
            <Button variant="outline" onClick={exportCsv} className="min-h-[44px]">
              <Download size={16} className="mr-2" />
              CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filters: group + view */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Ambos grupos
        </FilterChip>
        {groups.map((g) => (
          <FilterChip key={g.id} active={filter === g.id} onClick={() => setFilter(g.id)}>
            {g.name}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <FilterChip active={view === 'tarea'} onClick={() => setView('tarea')}>
          Por tarea
        </FilterChip>
        <FilterChip active={view === 'alumno'} onClick={() => setView('alumno')}>
          Por alumno
        </FilterChip>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <p className="font-medium">Sin tareas sincronizadas</p>
          <p className="text-sm mt-1">
            Abre Markbook → Scores en Richmond con la extensión activa.
          </p>
        </div>
      ) : (
        <>
          {/* Submissions-over-time chart */}
          <div className="rounded-xl border border-border p-4 mb-5">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Entregas por tarea en el tiempo
            </p>
            <div className="flex items-end gap-[3px] h-28 overflow-x-auto pb-1">
              {assignmentsAsc.map((a) => {
                const ratio = a.total_students ? a.total_submitted / a.total_students : 0
                return (
                  <div
                    key={a.id}
                    className="flex-shrink-0 w-2.5 rounded-t bg-primary/80 hover:bg-primary transition-colors cursor-default"
                    style={{ height: `${Math.max(4, ratio * 100)}%` }}
                    title={`${a.title}\n${new Date(a.due_at).toLocaleDateString('es-MX')}\n${a.total_submitted}/${a.total_students} entregaron`}
                  />
                )
              })}
            </div>
            <p className="text-[11px] text-text-disabled mt-1">
              Cada barra es una tarea (orden cronológico). Altura = % de alumnos que entregaron.
            </p>
          </div>

          {view === 'tarea' ? (
            <div className="space-y-2">
              {assignmentsDesc.map((a) => {
                const pending = pendingStudents(a)
                const isOpen = expandedTask === a.id
                const submitted = a.total_submitted
                const total = a.total_students
                return (
                  <div key={a.id} className="rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setExpandedTask(isOpen ? null : a.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                    >
                      <ChevronRight
                        size={16}
                        className={`shrink-0 text-text-disabled transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
                        <p className="text-xs text-text-disabled">
                          {new Date(a.due_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {filter === 'all' && ` · ${groupName(a.group_id)}`}
                        </p>
                      </div>
                      <RatioBar done={submitted} total={total} />
                    </button>

                    {isOpen && (
                      <div className="border-t border-border bg-muted/20 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-text-secondary">
                            {submitted}/{total} entregaron
                          </p>
                          {contacts.length > 0 && pending.length > 0 && (
                            <button
                              onClick={() => setNotifyingAssignment(a)}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Send size={12} /> Notificar pendientes
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                          {students
                            .filter((s) => s.group_id === a.group_id)
                            .map((s) => (
                              <button
                                key={s.key}
                                onClick={() => openStudent(s)}
                                className="flex items-center justify-between text-sm py-1 hover:text-primary text-left"
                              >
                                <span className="truncate">
                                  {s.last}, {s.first}
                                </span>
                                {s.submitted[a.id] ? (
                                  <span className="text-green-700 text-xs font-medium shrink-0">
                                    ✓ Entregó
                                  </span>
                                ) : (
                                  <span className="text-text-disabled text-xs shrink-0">
                                    Pendiente
                                  </span>
                                )}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border divide-y divide-border">
              {students.map((s) => {
                const { done, total } = completion(s)
                return (
                  <button
                    key={s.key}
                    onClick={() => openStudent(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {s.last}, {s.first}
                      </p>
                      {filter === 'all' && (
                        <p className="text-xs text-text-disabled">{groupName(s.group_id)}</p>
                      )}
                    </div>
                    <RatioBar done={done} total={total} label={`${done}/${total} tareas`} />
                    <ChevronRight size={16} className="shrink-0 text-text-disabled" />
                  </button>
                )
              })}
            </div>
          )}
        </>
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
                    Pega una lista con nombres y correos. La IA extrae los datos.
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
                    Toma una foto de tu lista de contactos. La IA extrae los correos.
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
                  <p className="text-xs text-text-secondary mb-3">Agrega contactos uno por uno.</p>
                  <Input
                    placeholder="ID alumno (requerido)"
                    value={manualStudentId}
                    onChange={(e) => setManualStudentId(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre"
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
            <p className="text-sm text-text-secondary mb-4">
              Tarea: <strong>{notifyingAssignment.title}</strong>
              <br />
              Se enviará correo a los padres (con contacto registrado) de los alumnos que aún no
              entregaron.
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
                onClick={() => handleNotify(notifyingAssignment)}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 size={15} className="mr-2 animate-spin" />
                ) : (
                  <Send size={15} className="mr-2" />
                )}
                {sending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-primary text-white' : 'bg-muted text-text-secondary hover:bg-muted/70'
      }`}
    >
      {children}
    </button>
  )
}

function RatioBar({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-secondary tabular-nums w-16 text-right">
        {label ?? `${done}/${total}`}
      </span>
    </div>
  )
}
