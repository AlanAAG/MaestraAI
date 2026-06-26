'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Download,
  Users,
  X,
  Send,
  Trash2,
  ChevronRight,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
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
// Richmond sends names in inconsistent casing (ALL CAPS / lowercase / mixed). Title-case for display.
const titleCase = (s: string) =>
  s
    .toLocaleLowerCase('es-MX')
    .replace(/(^|[\s'-])([^\s'-])/g, (_, sep, ch) => sep + ch.toLocaleUpperCase('es-MX'))

export default function CalificacionesRichmondPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filter, setFilter] = useState<'all' | string>('all') // 'all' or a group id
  const [view, setView] = useState<'tarea' | 'alumno'>('tarea')
  // One mutually-exclusive sort control (clearer than two separate chip groups).
  const [sort, setSort] = useState<'apellido' | 'nombre' | 'pendientes' | 'entregados'>('apellido')
  // Por-tarea has its own task-level sort (independent of the student sort above).
  const [taskSort, setTaskSort] = useState<
    'fecha_reciente' | 'fecha_antigua' | 'alfabetico' | 'mas_entregados' | 'menos_entregados'
  >('fecha_reciente')
  const nameOrder = sort === 'nombre' ? 'nombre' : 'apellido'
  const statusSort: 'ninguno' | 'pendientes' | 'entregados' =
    sort === 'pendientes' || sort === 'entregados' ? sort : 'ninguno'
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Contacts panel
  const [showContacts, setShowContacts] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  // Import (paste/photo/manual) moved to the Alumnos page; this panel is now template-only.
  const [contactTab, setContactTab] = useState<'paste' | 'photo' | 'manual' | 'plantilla'>(
    'plantilla'
  )
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
  const [confirmAll, setConfirmAll] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)

  // Email template editor (account-level)
  const [tplSubject, setTplSubject] = useState('')
  const [tplBody, setTplBody] = useState('')
  const [tplSaving, setTplSaving] = useState(false)

  // Pending student → saved contact lookup (Richmond's id is per-assignment, so match by name).
  const contactRidByName = useMemo(
    () =>
      new Map(
        contacts.map((c) => [
          norm(`${c.student_first_name ?? ''} ${c.student_last_name ?? ''}`),
          c.richmond_student_id,
        ])
      ),
    [contacts]
  )

  useEffect(() => {
    loadData(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  // Load the account-level email template when the contacts panel opens.
  useEffect(() => {
    if (!showContacts) return
    fetch('/api/teachers/email-template')
      .then((r) => r.json())
      .then((d) => {
        const t = d.template ?? d.default
        if (t) {
          setTplSubject(t.subject ?? '')
          setTplBody(t.body ?? '')
        }
      })
      .catch(() => {})
  }, [showContacts])

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

  const ridFor = (s: Student) => contactRidByName.get(norm(`${s.first} ${s.last}`))

  // Notify parents of pending students for one task. With `onlyStudent`, sends to just that family.
  async function handleNotify(a: Assignment, onlyStudent?: Student) {
    setSending(true)
    try {
      const targets = onlyStudent ? [onlyStudent] : pendingStudents(a)
      const ids = targets.map(ridFor).filter((x): x is string => !!x)
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
      toast.success(onlyStudent ? 'Correo enviado' : `Correos enviados a ${ids.length} familias`)
      setNotifyingAssignment(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pude enviar los correos.')
    } finally {
      setSending(false)
    }
  }

  // Digest: one email per parent listing all their child's pending tasks in the selected group.
  async function handleNotifyAll() {
    if (filter === 'all') return
    setSendingAll(true)
    try {
      const res = await fetch('/api/calificaciones/notify-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: filter }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (!data.sent)
        toast.error(data.message ?? 'Ningún padre con pendientes y correo registrado.')
      else toast.success(`Correos enviados a ${data.sent} familias`)
      setConfirmAll(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pude enviar los correos.')
    } finally {
      setSendingAll(false)
    }
  }

  async function handleSaveTemplate() {
    setTplSaving(true)
    try {
      const res = await fetch('/api/teachers/email-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: tplSubject, body: tplBody }),
      })
      if (!res.ok) throw new Error()
      toast.success('Plantilla guardada')
    } catch {
      toast.error('No pude guardar la plantilla.')
    } finally {
      setTplSaving(false)
    }
  }

  function openStudent(s: Student) {
    if (s.id) router.push(`/alumnos/${s.id}`)
    else toast.error('Este alumno aún no está vinculado. Vuelve a sincronizar el grupo.')
  }

  // ── derived ──
  const assignmentsAsc = [...assignments].sort((a, b) => a.due_at.localeCompare(b.due_at))
  const assignmentsDesc = [...assignments].sort((a, b) => b.due_at.localeCompare(a.due_at))
  const subRate = (a: Assignment) => (a.total_students ? a.total_submitted / a.total_students : 0)
  // Por-tarea list order, driven by taskSort.
  const assignmentsSorted = [...assignments].sort((a, b) => {
    switch (taskSort) {
      case 'fecha_antigua':
        return a.due_at.localeCompare(b.due_at)
      case 'alfabetico':
        return a.title.localeCompare(b.title)
      case 'mas_entregados':
        return subRate(b) - subRate(a)
      case 'menos_entregados':
        return subRate(a) - subRate(b)
      default:
        return b.due_at.localeCompare(a.due_at) // fecha_reciente
    }
  })
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? ''

  // per-student completion (submitted / total assignments in their group)
  function completion(s: Student) {
    const total = assignments.filter((a) => a.group_id === s.group_id).length
    const done = assignments.filter((a) => a.group_id === s.group_id && s.submitted[a.id]).length
    return { done, total }
  }

  // Sort a student list by the active name order; optionally pendientes/entregados first.
  // statusOf returns a number where LOWER = less complete (0 = pendiente, 1 = entregado / ratio).
  function sortStudents(list: Student[], statusOf?: (s: Student) => number) {
    const byName = (a: Student, b: Student) =>
      nameOrder === 'apellido'
        ? a.last.localeCompare(b.last) || a.first.localeCompare(b.first)
        : a.first.localeCompare(b.first) || a.last.localeCompare(b.last)
    if (statusSort === 'ninguno' || !statusOf) return [...list].sort(byName)
    const dir = statusSort === 'pendientes' ? 1 : -1
    return [...list].sort((a, b) => (statusOf(a) - statusOf(b)) * dir || byName(a, b))
  }

  const displayName = (s: Student | { first: string; last: string }) =>
    nameOrder === 'apellido'
      ? `${titleCase(s.last)}, ${titleCase(s.first)}`
      : `${titleCase(s.first)} ${titleCase(s.last)}`

  function exportCsv() {
    const headers = [
      'Apellido',
      'Nombre',
      'Grupo',
      ...assignmentsDesc.map((a) => a.title.slice(0, 30)),
    ]
    const rows = students.map((s) => [
      titleCase(s.last),
      titleCase(s.first),
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
            onClick={() => window.open('https://richmondlp.com', '_blank', 'noopener')}
            className="min-h-[44px]"
            title="Abrir Richmond LP en una pestaña nueva"
          >
            <ExternalLink size={16} className="mr-2" />
            Ir a Richmond
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setContactTab('plantilla')
              setShowContacts(true)
            }}
            className="min-h-[44px]"
            disabled={filter === 'all'}
            title={filter === 'all' ? 'Selecciona un grupo' : undefined}
          >
            <Users size={16} className="mr-2" />
            Plantilla de correo
          </Button>
          {filter !== 'all' && contacts.length > 0 && (
            <Button onClick={() => setConfirmAll(true)} className="min-h-[44px]">
              <Send size={16} className="mr-2" />
              Avisar a todos
            </Button>
          )}
          {students.length > 0 && (
            <Button variant="outline" onClick={exportCsv} className="min-h-[44px]">
              <Download size={16} className="mr-2" />
              CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filters — group scope (pills) · view (segmented) · sort (dropdown) */}
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              Ambos grupos
            </FilterChip>
            {groups.map((g) => (
              <FilterChip key={g.id} active={filter === g.id} onClick={() => setFilter(g.id)}>
                {g.name}
              </FilterChip>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Segmented
              options={[
                { value: 'tarea', label: 'Por tarea' },
                { value: 'alumno', label: 'Por alumno' },
              ]}
              value={view}
              onChange={(v) => setView(v as 'tarea' | 'alumno')}
            />
            <label className="relative">
              <span className="sr-only">Ordenar</span>
              {view === 'alumno' ? (
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="appearance-none rounded-full border border-border bg-muted/60 hover:bg-muted pl-3 pr-8 py-1.5 text-sm font-medium text-text-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="apellido">Ordenar: Apellido (A–Z)</option>
                  <option value="nombre">Ordenar: Nombre (A–Z)</option>
                  <option value="pendientes">Ordenar: Pendientes primero</option>
                  <option value="entregados">Ordenar: Entregados primero</option>
                </select>
              ) : (
                <select
                  value={taskSort}
                  onChange={(e) => setTaskSort(e.target.value as typeof taskSort)}
                  className="appearance-none rounded-full border border-border bg-muted/60 hover:bg-muted pl-3 pr-8 py-1.5 text-sm font-medium text-text-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="fecha_reciente">Ordenar: Más recientes</option>
                  <option value="fecha_antigua">Ordenar: Más antiguas</option>
                  <option value="alfabetico">Ordenar: Alfabético (A–Z)</option>
                  <option value="mas_entregados">Ordenar: Más entregados</option>
                  <option value="menos_entregados">Ordenar: Menos entregados</option>
                </select>
              )}
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-disabled"
              />
            </label>
          </div>
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
            Abre Markbook → Scores en Richmond con la extensión activa.
          </p>
        </div>
      ) : (
        <>
          {/* Submissions-over-time trend (always visible, fits width) */}
          <SubmissionTrend assignments={assignmentsAsc} />

          {view === 'tarea' ? (
            <div className="space-y-2">
              {assignmentsSorted.map((a) => {
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
                          {sortStudents(
                            students.filter((s) => s.group_id === a.group_id),
                            (s) => (s.submitted[a.id] ? 1 : 0)
                          ).map((s) => (
                            <div
                              key={s.key}
                              className="flex items-center justify-between gap-2 text-sm py-1"
                            >
                              <button
                                onClick={() => openStudent(s)}
                                className="truncate hover:text-primary text-left"
                              >
                                {displayName(s)}
                              </button>
                              {s.submitted[a.id] ? (
                                <span className="text-green-700 text-xs font-medium shrink-0">
                                  ✓ Entregó
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 shrink-0">
                                  {ridFor(s) && (
                                    <button
                                      onClick={() => handleNotify(a, s)}
                                      disabled={sending}
                                      className="text-primary text-xs hover:underline disabled:opacity-50"
                                    >
                                      Notificar
                                    </button>
                                  )}
                                  <span className="text-text-disabled text-xs">Pendiente</span>
                                </span>
                              )}
                            </div>
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
              {sortStudents(students, (s) => {
                const { done, total } = completion(s)
                return total ? done / total : 0
              }).map((s) => {
                const { done, total } = completion(s)
                return (
                  <button
                    key={s.key}
                    onClick={() => openStudent(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {displayName(s)}
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
              <h2 className="text-lg font-semibold">Plantilla de correo</h2>
              <button onClick={closeContacts}>
                <X size={20} />
              </button>
            </div>
            <div className="px-5 pt-4">
              <p className="text-xs text-text-secondary rounded-lg bg-muted/60 px-3 py-2">
                Los contactos de padres ahora se importan y gestionan en la página de{' '}
                <span className="font-medium text-text-primary">Alumnos</span>.
              </p>
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
                  <p className="text-xs text-text-secondary mb-3">Agrega el correo de un alumno.</p>
                  {/* Student dropdown — populated from the loaded roster */}
                  <select
                    value={manualStudentId}
                    onChange={(e) => {
                      const s = students.find((st) => st.key === e.target.value)
                      setManualStudentId(e.target.value)
                      setManualFirstName(s?.first ?? '')
                      setManualLastName(s?.last ?? '')
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona un alumno…</option>
                    {students
                      .filter((s) => filter === 'all' || s.group_id === filter)
                      .sort(
                        (a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first)
                      )
                      .map((s) => (
                        <option key={s.key} value={s.key}>
                          {titleCase(s.last)}, {titleCase(s.first)}
                        </option>
                      ))}
                  </select>
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
              {contactTab === 'plantilla' && (
                <div className="space-y-3">
                  <p className="text-xs text-text-secondary">
                    Personaliza el correo a los padres. Usa <code>{'{padre}'}</code>,{' '}
                    <code>{'{alumno}'}</code> y <code>{'{tareas}'}</code> donde quieras insertar el
                    saludo, el nombre del alumno y la lista de tareas pendientes.
                  </p>
                  <Input
                    placeholder="Asunto"
                    value={tplSubject}
                    onChange={(e) => setTplSubject(e.target.value)}
                  />
                  <textarea
                    value={tplBody}
                    onChange={(e) => setTplBody(e.target.value)}
                    rows={10}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none font-mono"
                  />
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={tplSaving || !tplSubject.trim() || !tplBody.trim()}
                    className="w-full"
                  >
                    {tplSaving ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
                    Guardar plantilla
                  </Button>
                </div>
              )}
              {contactTab !== 'plantilla' && contacts.length > 0 && (
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

      {/* Bulk digest confirmation modal */}
      {confirmAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !sendingAll && setConfirmAll(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-text-primary mb-2">Avisar a todos los pendientes</h3>
            <p className="text-sm text-text-secondary mb-4">
              Se enviará <strong>un solo correo</strong> a cada familia (con contacto registrado)
              con la lista de tareas que su hijo/a aún no entrega.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmAll(false)}
                disabled={sendingAll}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleNotifyAll} disabled={sendingAll}>
                {sendingAll ? (
                  <Loader2 size={15} className="mr-2 animate-spin" />
                ) : (
                  <Send size={15} className="mr-2" />
                )}
                {sendingAll ? 'Enviando...' : 'Enviar'}
              </Button>
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

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex rounded-full bg-muted/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            value === o.value
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Smooth area chart of % entregado over time. Inline SVG (no chart lib), fits container width.
// vector-effect keeps stroke crisp while the viewBox stretches via preserveAspectRatio="none".
function SubmissionTrend({ assignments }: { assignments: Assignment[] }) {
  const pts = assignments.map((a) => ({
    a,
    ratio: a.total_students ? a.total_submitted / a.total_students : 0,
  }))
  const n = pts.length
  const TOP = 8
  const BOT = 4 // % padding inside the 0–100 viewBox so 0%/100% aren't clipped
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100)
  const y = (r: number) => TOP + (1 - r) * (100 - TOP - BOT)

  const coords = pts.map((p, i) => ({ px: x(i), py: y(p.ratio) }))
  // Smooth cubic path with control points at the horizontal midpoint (monotone in x).
  let line = ''
  if (n === 1) {
    line = `M 0 ${coords[0].py} L 100 ${coords[0].py}`
  } else if (n > 1) {
    line = `M ${coords[0].px} ${coords[0].py}`
    for (let i = 1; i < n; i++) {
      const cx = (coords[i - 1].px + coords[i].px) / 2
      line += ` C ${cx} ${coords[i - 1].py}, ${cx} ${coords[i].py}, ${coords[i].px} ${coords[i].py}`
    }
  }
  const area = line ? `${line} L 100 100 L 0 100 Z` : ''
  const latest = n ? Math.round(pts[n - 1].ratio * 100) : 0

  const [hover, setHover] = useState<number | null>(null)
  const shortDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  // X-axis: label every k-th task so labels don't overlap (aim for ≤6 labels).
  const step = Math.max(1, Math.ceil(n / 6))
  const hp = hover !== null ? pts[hover] : null

  return (
    <div className="rounded-xl border border-border p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          % de entregas por tarea
        </p>
        <span className="text-xs text-text-disabled">
          Última tarea: <span className="font-semibold text-text-primary">{latest}%</span>
        </span>
      </div>
      <div className="relative h-32">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full text-primary overflow-visible"
        >
          <defs>
            <linearGradient id="subFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((g) => (
            <line
              key={g}
              x1="0"
              x2="100"
              y1={y(g)}
              y2={y(g)}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {area && <path d={area} fill="url(#subFill)" />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Hover guide line + dot (HTML overlay avoids SVG aspect distortion) */}
        {hp && (
          <>
            <div
              className="absolute top-0 bottom-0 w-px bg-primary/40 pointer-events-none"
              style={{ left: `${x(hover!)}%` }}
            />
            <div
              className="absolute w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x(hover!)}%`, top: `${y(hp.ratio)}%` }}
            />
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-full -mt-2 whitespace-nowrap rounded-lg bg-text-primary px-2.5 py-1.5 text-[11px] text-white shadow-lg pointer-events-none"
              style={{ left: `${Math.min(85, Math.max(15, x(hover!)))}%`, top: `${y(hp.ratio)}%` }}
            >
              <p className="font-semibold max-w-[160px] truncate">{hp.a.title}</p>
              <p className="opacity-80">
                {shortDate(hp.a.due_at)} · {hp.a.total_submitted}/{hp.a.total_students} (
                {Math.round(hp.ratio * 100)}%)
              </p>
            </div>
          </>
        )}

        {/* Transparent hover targets */}
        <div className="absolute inset-0 flex">
          {pts.map((p, i) => (
            <div
              key={p.a.id}
              className="flex-1 cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </div>
      </div>

      {/* X-axis date labels (sampled to avoid overlap) */}
      <div className="relative h-4 mt-1">
        {pts.map((p, i) =>
          i % step === 0 || i === n - 1 ? (
            <span
              key={p.a.id}
              className="absolute -translate-x-1/2 text-[10px] text-text-disabled whitespace-nowrap"
              style={{ left: `${Math.min(94, Math.max(6, x(i)))}%` }}
            >
              {shortDate(p.a.due_at)}
            </span>
          ) : null
        )}
      </div>
    </div>
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
