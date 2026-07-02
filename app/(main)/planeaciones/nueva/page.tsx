'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { z } from 'zod'
import { AlertCircle, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { ObservationCalendar } from '@/components/planner/ObservationCalendar'
import { UnitSelector, type RichmondSelection } from '@/components/richmond/UnitSelector'
import { VocabularySections } from '@/components/richmond/VocabularySections'
import type { SelectedRichmondContent } from '@/lib/richmond/types'
import { isProniApplicable } from '@/lib/nem-official-data'

// NEM methodologies the teacher can pick per unit (must match keys in METHODOLOGY_STRUCTURE).
const MODALIDADES = [
  'Proyecto',
  'Centro de Interés',
  'Taller Crítico',
  'Aprendizaje Basado en el Juego',
  'Situación Didáctica',
  'Aprendizaje Basado en Proyectos Comunitarios',
  'Aprendizaje Basado en Indagación (STEAM)',
  'Aprendizaje Basado en Problemas',
  'Aprendizaje-Servicio',
] as const

// One or more single letters separated by commas (e.g. "A" or "A, B"). Accent-aware.
const LETTERS_RE = /^[A-Za-zÁáÉéÍíÓóÚúÑñÜü](\s*,\s*[A-Za-zÁáÉéÍíÓóÚúÑñÜü])*$/
const FortnightSchema = z.object({
  // number + project_name are derived at insert (auto-number / Unit 1), not form fields anymore.
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  monthly_value: z.string().max(100, 'Máximo 100 caracteres').optional(),
  letter_week1: z.string().regex(LETTERS_RE, 'Una o más letras separadas por coma').optional(),
  letter_week2: z.string().regex(LETTERS_RE, 'Una o más letras separadas por coma').optional(),
})

type Template = { id: string; label: string; plan_type: string }

export default function NuevaPlaneacionPage() {
  const router = useRouter()
  const [planType, setPlanType] = useState<'quincena' | 'taller' | 'mes'>('quincena')
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    monthly_value: '',
    letter_week1: '',
    letter_week2: '',
  })
  // Planeaciones are per-GRADE. selectedGroupId is the representative group of that grade
  // (first one) — it provides the schedule + observation roster; generation fans out to all
  // groups of the grade.
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [groups, setGroups] = useState<{ id: string; name: string; grade: string }[]>([])
  const [groupStudents, setGroupStudents] = useState<string[]>([])
  // All of the teacher's students (across groups) — autocomplete source for observation.
  const [allStudentNames, setAllStudentNames] = useState<string[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Optional book pages to cover, per week (quincena) — week1 doubles as the single field for taller.
  const [richmondBookPages, setRichmondBookPages] = useState({
    week1: '',
    week2: '',
  })
  // Richmond Unit Overview (book catalog) — PRONI / Kinder 3 only.
  const [richmondSelection, setRichmondSelection] = useState<RichmondSelection | null>(null)
  const [richmondContent, setRichmondContent] = useState<SelectedRichmondContent | null>(null)
  const [observationCalendar, setObservationCalendar] = useState<Record<string, string[]>>({})
  const [allVocab, setAllVocab] = useState<{ id: string; word: string; letter: string }[]>([])
  const [extraMaterials, setExtraMaterials] = useState<string[]>([])
  const [manualMaterial, setManualMaterial] = useState('')
  // Teacher-defined didactic units. Unit 1 = the project (its name is the plan's project_name);
  // the rest become sub-plans. Always starts with one unit since Unit 1 is now required.
  const [unidades, setUnidades] = useState<
    Array<{ metodologia: string; nombre: string; tema: string }>
  >([{ metodologia: 'Proyecto', nombre: '', tema: '' }])
  // Optional teacher details (general + project-specific) — both feed generation.
  const [teacherNotes, setTeacherNotes] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  // Binary choice: use the teacher's uploaded format, or MaestraIA's built-in design.
  const [useSystemTemplate, setUseSystemTemplate] = useState(false)
  const [groupSchedule, setGroupSchedule] = useState<{
    letter_number_day?: string
    numeros_day?: string
  } | null>(null)

  // Distinct grades the teacher has groups for — the planeación is scoped to one of these.
  const grades = useMemo(
    () => Array.from(new Set(groups.map((g) => g.grade).filter(Boolean))),
    [groups]
  )
  const gradeGroups = useMemo(
    () => groups.filter((g) => g.grade === selectedGrade),
    [groups, selectedGrade]
  )

  // Switching grade picks its first group as the representative (schedule + roster source).
  function selectGrade(grade: string) {
    setSelectedGrade(grade)
    const rep = groups.find((g) => g.grade === grade)
    setSelectedGroupId(rep?.id ?? '')
  }

  // PRONI (Kinder 3) gates the Richmond unit selector + the read-only Richmond vocabulary section.
  const proniActive = isProniApplicable(selectedGrade)

  // The teacher's vocabulary for the planeación is NOT hand-picked — it's every one of her words
  // for the letters she's working this quincena (Letra semana 1 + 2). Letters drive the vocab.
  const quincenaLetters = useMemo(
    () =>
      [formData.letter_week1, formData.letter_week2]
        .flatMap((l) => l.split(',').map((x) => x.trim().toUpperCase()))
        .filter(Boolean),
    [formData.letter_week1, formData.letter_week2]
  )
  const letterVocab = useMemo(
    () =>
      quincenaLetters.length === 0
        ? []
        : allVocab
            .filter((v) => quincenaLetters.includes((v.letter ?? '').toUpperCase()))
            .map((v) => v.word),
    [quincenaLetters, allVocab]
  )

  useEffect(() => {
    loadGroups()
    fetch('/api/vocabulary')
      .then((r) => r.json())
      .then((d) => setAllVocab(d.vocabulary ?? []))
      .catch((err) => console.error('Failed to load vocabulary:', err))
    fetch('/api/students?group_id=all')
      .then((r) => (r.ok ? r.json() : { students: [] }))
      .then(({ students }: { students: { name: string }[] }) =>
        setAllStudentNames((students ?? []).map((s) => s.name))
      )
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupStudents([])
      setGroupSchedule(null)
      return
    }
    const supabase = createClient()
    // Names are encrypted at rest — fetch decrypted via the server route.
    fetch(`/api/students?group_id=${selectedGroupId}`)
      .then((r) => (r.ok ? r.json() : { students: [] }))
      .then(({ students }: { students: { name: string }[] }) => {
        setGroupStudents((students ?? []).map((s) => s.name))
      })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('groups')
      .select('fixed_weekly_schedule')
      .eq('id', selectedGroupId)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: { fixed_weekly_schedule: any } | null }) => {
        setGroupSchedule(data?.fixed_weekly_schedule ?? null)
      })
  }, [selectedGroupId])

  useEffect(() => {
    fetch(`/api/teachers/templates?plan_type=${planType}`)
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates ?? [])
      })
      .catch(() => {})
  }, [planType])

  async function loadGroups() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()
      if (!teacher) {
        setError('No se encontró tu perfil de maestra')
        setLoadingGroups(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groupsData, error: groupsError } = await (supabase as any)
        .from('groups')
        .select('id, name, grade')
        .eq('titular_teacher_id', teacher.id)
        .order('name')

      if (groupsError) {
        setError('No pude cargar tus grupos. Por favor recarga la página.')
        setLoadingGroups(false)
        return
      }
      if (!groupsData || groupsData.length === 0) {
        router.push('/configuracion?message=create_group_first')
        return
      }

      setGroups(groupsData)
      setSelectedGrade(groupsData[0].grade ?? '')
      setSelectedGroupId(groupsData[0].id)
    } catch {
      setError('Error al cargar los grupos')
    } finally {
      setLoadingGroups(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGrade || !selectedGroupId) {
      setError('Por favor selecciona un grado')
      return
    }

    setLoading(true)
    setError('')
    setFieldErrors({})

    // The project is Unit 1 — its name is required (replaces the old project_name field).
    const cleanUnidades = unidades.filter((u) => u.nombre.trim() || u.tema.trim())
    const projectName = cleanUnidades[0]?.nombre?.trim() ?? ''
    if (!projectName) {
      setFieldErrors({ unidad: 'Ponle nombre al proyecto (Unidad 1)' })
      setError('Ponle un nombre al proyecto (Unidad 1).')
      setLoading(false)
      return
    }

    try {
      const validated = FortnightSchema.parse({
        start_date: formData.start_date,
        end_date: formData.end_date,
        monthly_value: formData.monthly_value || undefined,
        letter_week1: formData.letter_week1 || undefined,
        letter_week2: formData.letter_week2 || undefined,
      })

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()
      if (!teacher) {
        setError('No encontré tu perfil. Por favor recarga la página.')
        setLoading(false)
        return
      }

      const hasBookPages = !!(richmondBookPages.week1 || richmondBookPages.week2)
      const hasObsCal = Object.values(observationCalendar).some((v) => v.length > 0)

      // Auto-number: next in this teacher's sequence (1-12). Best-effort — defaults to 1.
      let nextNumber = 1
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: last } = await (supabase as any)
          .from('fortnights')
          .select('number')
          .eq('teacher_id', teacher.id)
          .order('number', { ascending: false })
          .limit(1)
          .maybeSingle()
        nextNumber = Math.min(12, ((last?.number as number) ?? 0) + 1)
      } catch {
        /* default 1 */
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fortnight, error: fortnightError } = await (supabase as any)
        .from('fortnights')
        .insert({
          teacher_id: teacher.id,
          group_id: selectedGroupId,
          ...validated,
          number: nextNumber,
          project_name: projectName, // derived from Unit 1 (the project)
          monthly_value: formData.monthly_value.trim() || null,
          plan_type: planType,
          status: 'draft',
          vocabulary: letterVocab.length > 0 ? letterVocab : null,
          physical_materials: extraMaterials.length > 0 ? extraMaterials : null,
          ...(hasBookPages ? { richmond_book_pages: richmondBookPages } : {}),
          ...(hasObsCal ? { observation_calendar: observationCalendar } : {}),
          ...(cleanUnidades.length ? { unidades_didacticas: cleanUnidades } : {}),
        })
        .select()
        .single()

      if (fortnightError) throw fortnightError

      // Best-effort updates (separate so one missing migration doesn't block the other).
      // Each is ignored (no throw) if its column isn't applied yet — creation never breaks.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      // Per-grade scope (migration 059). Best-effort so creation never breaks if not applied yet.
      await sb
        .from('fortnights')
        .update({ grade: selectedGrade })
        .eq('id', fortnight.id)
        .then(
          () => {},
          () => {}
        )
      if (useSystemTemplate) {
        await sb.from('fortnights').update({ use_system_template: true }).eq('id', fortnight.id)
      }
      // project_notes now comes from Unit 1's "tema / detalles".
      const projectNotes = cleanUnidades[0]?.tema?.trim() ?? ''
      if (teacherNotes.trim() || projectNotes) {
        await sb
          .from('fortnights')
          .update({
            teacher_notes: teacherNotes.trim() || null,
            project_notes: projectNotes || null,
          })
          .eq('id', fortnight.id)
      }
      // Richmond unit selection (best-effort: ignored until migration 056 is pushed).
      if (proniActive && richmondSelection?.unit_id) {
        await sb
          .from('fortnights')
          .update({
            richmond_unit_id: richmondSelection.unit_id,
            richmond_lesson_group_ids: richmondSelection.lesson_group_ids,
          })
          .eq('id', fortnight.id)
      }

      router.push(`/planeaciones/${fortnight.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        err.issues.forEach((issue) => {
          if (issue.path[0]) errors[issue.path[0].toString()] = issue.message
        })
        setFieldErrors(errors)
        setError('Por favor corrige los errores en el formulario')
      } else {
        setError('No pude crear la planeación. Por favor intenta de nuevo.')
      }
      setLoading(false)
    }
  }

  if (loadingGroups) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <Card className="p-6">
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Crear Nueva Planeación</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Plan type toggle */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Tipo de planeación</h3>
          <div className="flex gap-2">
            {(['quincena', 'mes', 'taller'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPlanType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  planType === t
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-text-secondary border-border hover:border-primary'
                }`}
              >
                {t === 'quincena' ? 'Quincena' : t === 'mes' ? 'Mes' : 'Taller'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {planType === 'quincena'
              ? 'Plan de 2 semanas con proyecto, Letter & Number y Números'
              : planType === 'mes'
                ? 'Plan de 1 mes (4 semanas) con proyecto, Letter & Number y Números'
                : 'Taller crítico independiente (1-3 sesiones específicas)'}
          </p>
        </Card>

        {/* Grade Selection — planeación covers the whole grade (all its groups) */}
        <Card className="p-6 border-2">
          <label htmlFor="grade" className="block text-sm font-medium text-text-primary mb-2">
            Grado
          </label>
          <select
            id="grade"
            value={selectedGrade}
            onChange={(e) => selectGrade(e.target.value)}
            required
            className="w-full min-h-[44px] px-3 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Selecciona el grado</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {gradeGroups.length > 0 && (
            <p className="mt-2 text-xs text-text-secondary">
              La planeación cubre {gradeGroups.length === 1 ? 'el grupo' : 'los grupos'}:{' '}
              {gradeGroups.map((g) => g.name).join(', ')}
            </p>
          )}
        </Card>

        {/* Unidades didácticas — the project source for every plan type (Unit 1 = the project). */}
        {
          <Card className="p-6 border-2">
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              🧩 {planType === 'taller' ? 'El taller' : 'Unidades didácticas'}
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              {planType === 'taller' ? (
                <>
                  La <strong>Unidad 1</strong> es tu taller: elige su metodología y ponle nombre.
                </>
              ) : (
                <>
                  La <strong>Unidad 1</strong> es el proyecto principal (con la estructura de su
                  metodología). Letter &amp; Number y Números se generan automáticamente. Agrega
                  aquí unidades extra como un Taller o un día de juego.
                </>
              )}
            </p>
            {unidades.length > 0 && (
              <div className="space-y-3 mb-3">
                {unidades.map((u, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">
                        Unidad {i + 1}
                        {i === 0
                          ? planType === 'taller'
                            ? ' (el Taller)'
                            : ' (Proyecto principal)'
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUnidades((p) => p.filter((_, x) => x !== i))}
                        className="text-text-secondary hover:text-red-500 cursor-pointer"
                        aria-label="Quitar unidad"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={u.metodologia}
                        onChange={(e) =>
                          setUnidades((p) =>
                            p.map((x, idx) =>
                              idx === i ? { ...x, metodologia: e.target.value } : x
                            )
                          )
                        }
                        className="min-h-[40px] px-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {MODALIDADES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={u.nombre}
                        onChange={(e) =>
                          setUnidades((p) =>
                            p.map((x, idx) => (idx === i ? { ...x, nombre: e.target.value } : x))
                          )
                        }
                        placeholder="Nombre (ej. Salvemos al Planeta)"
                        className="h-10 text-sm"
                      />
                    </div>
                    <Input
                      value={u.tema}
                      onChange={(e) =>
                        setUnidades((p) =>
                          p.map((x, idx) => (idx === i ? { ...x, tema: e.target.value } : x))
                        )
                      }
                      placeholder="Tema / detalles (días con fechas, páginas de libros…)"
                      className="h-10 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setUnidades((p) => [...p, { metodologia: 'Proyecto', nombre: '', tema: '' }])
              }
            >
              + Agregar unidad
            </Button>
          </Card>
        }

        {/* Libro Richmond (book catalog) — PRONI / Kinder 3 only. The single Richmond section. */}
        {proniActive && (
          <Card className="p-6 border-2">
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              📚 Libro Richmond <span className="font-normal text-text-secondary">(opcional)</span>
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Elige la unidad y lecciones; su vocabulario y modelos de lenguaje se usan al generar.
            </p>
            <UnitSelector onChange={setRichmondSelection} onResolved={setRichmondContent} />
            <div className="mt-4 pt-4 border-t border-border">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Páginas del libro a trabajar{' '}
                <span className="font-normal text-text-secondary">(opcional)</span>
              </label>
              <p className="mb-2 text-xs text-text-secondary">
                Se citarán dentro del proyecto (ej. “Student Book pp. 10-15”). Uno o varios rangos
                separados por comas, sin “pp.” — ej. 10-15, 21-24, 30
              </p>
              {planType !== 'taller' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Semana 1</label>
                    <Input
                      value={richmondBookPages.week1}
                      onChange={(e) =>
                        setRichmondBookPages((p) => ({ ...p, week1: e.target.value }))
                      }
                      placeholder="10-15, 21-24, 30"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Semana 2</label>
                    <Input
                      value={richmondBookPages.week2}
                      onChange={(e) =>
                        setRichmondBookPages((p) => ({ ...p, week2: e.target.value }))
                      }
                      placeholder="16-20, 28"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <Input
                  value={richmondBookPages.week1}
                  onChange={(e) => setRichmondBookPages((p) => ({ ...p, week1: e.target.value }))}
                  placeholder="10-15, 21-24, 30"
                  className="h-9 text-sm"
                />
              )}
            </div>
          </Card>
        )}

        {/* Dates */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Fechas</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="start_date"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Fecha inicio
              </label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => {
                  setFormData({ ...formData, start_date: e.target.value })
                  setFieldErrors({ ...fieldErrors, start_date: '' })
                }}
                required
                className={`min-h-[44px] ${fieldErrors.start_date ? 'border-red-500' : ''}`}
              />
              {fieldErrors.start_date && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.start_date}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="end_date"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Fecha fin
              </label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => {
                  setFormData({ ...formData, end_date: e.target.value })
                  setFieldErrors({ ...fieldErrors, end_date: '' })
                }}
                required
                className={`min-h-[44px] ${fieldErrors.end_date ? 'border-red-500' : ''}`}
              />
              {fieldErrors.end_date && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.end_date}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <label
              htmlFor="monthly_value"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Valor del mes <span className="font-normal text-text-secondary">(opcional)</span>
            </label>
            <Input
              id="monthly_value"
              value={formData.monthly_value}
              onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
              placeholder="Ej: Respeto"
              className="min-h-[44px]"
            />
          </div>
        </Card>

        {/* Letters — quincena only */}
        {planType !== 'taller' && (
          <Card className="p-6 border-2">
            <h3 className="text-sm font-semibold text-text-primary mb-1">Letras a trabajar</h3>
            <p className="text-xs text-text-secondary mb-4">
              Una o más letras por semana, separadas por coma (ej. A, B).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="letter_week1"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  Letras semana 1
                </label>
                <Input
                  id="letter_week1"
                  value={formData.letter_week1}
                  onChange={(e) => {
                    setFormData({ ...formData, letter_week1: e.target.value.toUpperCase() })
                    setFieldErrors({ ...fieldErrors, letter_week1: '' })
                  }}
                  placeholder="A, B"
                  className={`min-h-[44px] ${fieldErrors.letter_week1 ? 'border-red-500' : ''}`}
                />
                {fieldErrors.letter_week1 && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.letter_week1}
                  </p>
                )}
                {!fieldErrors.letter_week1 && (
                  <p className="mt-1 text-xs text-text-secondary">
                    Primera semana ({groupSchedule?.letter_number_day ?? 'martes'})
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="letter_week2"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  Letras semana 2
                </label>
                <Input
                  id="letter_week2"
                  value={formData.letter_week2}
                  onChange={(e) => {
                    setFormData({ ...formData, letter_week2: e.target.value.toUpperCase() })
                    setFieldErrors({ ...fieldErrors, letter_week2: '' })
                  }}
                  placeholder="C, D"
                  className={`min-h-[44px] ${fieldErrors.letter_week2 ? 'border-red-500' : ''}`}
                />
                {fieldErrors.letter_week2 && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.letter_week2}
                  </p>
                )}
                {!fieldErrors.letter_week2 && (
                  <p className="mt-1 text-xs text-text-secondary">
                    Segunda semana ({groupSchedule?.letter_number_day ?? 'martes'})
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Observation Calendar */}
        {selectedGroupId && (
          <Card className="p-6 border-2">
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Calendario de observación{' '}
              <span className="font-normal text-text-secondary">(opcional)</span>
            </h3>
            <p className="text-xs text-text-secondary mb-3">
              Selecciona qué alumnos observarás cada día de la quincena
            </p>
            <ObservationCalendar
              students={allStudentNames.length > 0 ? allStudentNames : groupStudents}
              value={observationCalendar}
              onChange={setObservationCalendar}
            />
          </Card>
        )}

        {/* Vocabulary — Richmond (read-only) + the teacher's words for this quincena's letters */}
        <VocabularySections
          richmondContent={richmondContent}
          letters={quincenaLetters}
          teacherWords={letterVocab}
        />

        {/* Extra Materials */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Materiales extras <span className="font-normal text-text-secondary">(opcional)</span>
          </h3>
          <p className="text-xs text-text-secondary mb-3">
            Base siempre disponible: pizarrón, crayones, hojas, proyector, tijeras, pegamento,
            flashcards MaestraIA.
          </p>
          <div className="flex gap-2 mb-3">
            <Input
              value={manualMaterial}
              onChange={(e) => setManualMaterial(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualMaterial.trim()) {
                  e.preventDefault()
                  const w = manualMaterial.trim()
                  setExtraMaterials((p) => (p.includes(w) ? p : [...p, w]))
                  setManualMaterial('')
                }
              }}
              placeholder="Ej: plastilina, dados, ruleta"
              className="h-9 text-sm"
            />
          </div>
          {extraMaterials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {extraMaterials.map((m) => (
                <span
                  key={m}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => setExtraMaterials((p) => p.filter((x) => x !== m))}
                    className="ml-1 hover:text-red-500 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Notas para MaestraIA — free-form guidance for the AI (general, optional) */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Notas para MaestraIA <span className="font-normal text-text-secondary">(opcional)</span>
          </h3>
          <p className="text-xs text-text-secondary mb-3">
            Actividades, juegos o materiales específicos que quieras incluir. Entre más detalles,
            mejor.
          </p>
          <textarea
            value={teacherNotes}
            onChange={(e) => setTeacherNotes(e.target.value)}
            rows={3}
            placeholder="Ej: Quiero incluir un juego de memoria el martes. Tengo plastilina y bloques."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </Card>

        {/* Template discovery hint */}
        {templates.length === 0 && (
          <p className="text-xs text-text-secondary px-1">
            ¿Tu escuela tiene un formato propio?{' '}
            <Link href="/configuracion" className="text-primary underline">
              Agrégalo en Configuración
            </Link>{' '}
            para que MaestraIA lo siga exactamente.
          </p>
        )}

        {/* Template choice: the teacher's uploaded format, or MaestraIA's built-in design */}
        {templates.length > 0 && (
          <Card className="p-6 border-2">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Formato de la planeación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  {
                    val: false,
                    title: 'Mi formato escolar',
                    desc: 'MaestraIA seguirá el formato que subiste',
                  },
                  {
                    val: true,
                    title: 'Diseño de MaestraIA',
                    desc: 'Usa el diseño y estructura predeterminados',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={String(opt.val)}
                  type="button"
                  onClick={() => setUseSystemTemplate(opt.val)}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                    useSystemTemplate === opt.val
                      ? 'bg-primary/10 border-primary'
                      : 'bg-surface border-border hover:border-primary'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${useSystemTemplate === opt.val ? 'text-primary' : 'text-text-primary'}`}
                  >
                    {opt.title}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 min-h-[44px] bg-primary hover:bg-primary-dark"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando tu planeación...
              </>
            ) : (
              'Crear mi planeación'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
