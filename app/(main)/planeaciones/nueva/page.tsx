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
import { RichmondUnitSelector } from '@/components/app/RichmondUnitSelector'
import { ObservationCalendar } from '@/components/planner/ObservationCalendar'
import { UnitSelector, type RichmondSelection } from '@/components/richmond/UnitSelector'
import { VocabularySections } from '@/components/richmond/VocabularySections'
import type { SelectedRichmondContent } from '@/lib/richmond/types'
import { isProniApplicable } from '@/lib/nem-official-data'

const FortnightSchema = z.object({
  number: z.number().min(1, 'Debe ser entre 1 y 12').max(12, 'Debe ser entre 1 y 12'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  project_name: z.string().min(1, 'El proyecto es requerido').max(200, 'Máximo 200 caracteres'),
  monthly_value: z.string().min(1, 'El valor es requerido').max(100, 'Máximo 100 caracteres'),
  letter_week1: z
    .string()
    .regex(/^[A-Za-zÁáÉéÍíÓóÚúÑñÜü]$/, 'Debe ser una letra del alfabeto')
    .optional(),
  letter_week2: z
    .string()
    .regex(/^[A-Za-zÁáÉéÍíÓóÚúÑñÜü]$/, 'Debe ser una letra del alfabeto')
    .optional(),
})

type Template = { id: string; label: string; plan_type: string }

export default function NuevaPlaneacionPage() {
  const router = useRouter()
  const [planType, setPlanType] = useState<'quincena' | 'taller'>('quincena')
  const [formData, setFormData] = useState({
    number: '',
    start_date: '',
    end_date: '',
    project_name: '',
    monthly_value: '',
    letter_week1: '',
    letter_week2: '',
  })
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [groups, setGroups] = useState<{ id: string; name: string; grade: string }[]>([])
  const [groupStudents, setGroupStudents] = useState<string[]>([])
  // All of the teacher's students (across groups) — autocomplete source for observation.
  const [allStudentNames, setAllStudentNames] = useState<string[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [richmondUnit, setRichmondUnit] = useState('')
  const [richmondBookPages, setRichmondBookPages] = useState({
    student_book: '',
    activity_book: '',
    assessment: '',
  })
  // Richmond Unit Overview (book catalog) — PRONI / Kinder 3 only.
  const [richmondSelection, setRichmondSelection] = useState<RichmondSelection | null>(null)
  const [richmondContent, setRichmondContent] = useState<SelectedRichmondContent | null>(null)
  const [observationCalendar, setObservationCalendar] = useState<Record<string, string[]>>({})
  const [allVocab, setAllVocab] = useState<{ id: string; word: string; letter: string }[]>([])
  const [extraMaterials, setExtraMaterials] = useState<string[]>([])
  const [manualMaterial, setManualMaterial] = useState('')
  // Optional teacher details (general + project-specific) — both feed generation.
  const [teacherNotes, setTeacherNotes] = useState('')
  const [projectNotes, setProjectNotes] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  // Binary choice: use the teacher's uploaded format, or MaestraIA's built-in design.
  const [useSystemTemplate, setUseSystemTemplate] = useState(false)
  const [groupSchedule, setGroupSchedule] = useState<{
    letter_number_day?: string
    numeros_day?: string
  } | null>(null)

  // PRONI (Kinder 3) gates the Richmond unit selector + the read-only Richmond vocabulary section.
  const proniActive = isProniApplicable(groups.find((g) => g.id === selectedGroupId)?.grade ?? '')

  // The teacher's vocabulary for the planeación is NOT hand-picked — it's every one of her words
  // for the letters she's working this quincena (Letra semana 1 + 2). Letters drive the vocab.
  const quincenaLetters = useMemo(
    () =>
      [formData.letter_week1, formData.letter_week2]
        .map((l) => l.trim().toUpperCase())
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
      setSelectedGroupId(groupsData[0].id)
    } catch {
      setError('Error al cargar los grupos')
    } finally {
      setLoadingGroups(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGroupId) {
      setError('Por favor selecciona un grupo')
      return
    }

    setLoading(true)
    setError('')
    setFieldErrors({})

    try {
      const validated = FortnightSchema.parse({
        ...formData,
        number: parseInt(formData.number),
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

      const hasBookPages =
        richmondBookPages.student_book ||
        richmondBookPages.activity_book ||
        richmondBookPages.assessment
      const hasObsCal = Object.values(observationCalendar).some((v) => v.length > 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fortnight, error: fortnightError } = await (supabase as any)
        .from('fortnights')
        .insert({
          teacher_id: teacher.id,
          group_id: selectedGroupId,
          ...validated,
          plan_type: planType,
          status: 'draft',
          vocabulary: letterVocab.length > 0 ? letterVocab : null,
          physical_materials: extraMaterials.length > 0 ? extraMaterials : null,
          ...(richmondUnit ? { richmond_unit: richmondUnit } : {}),
          ...(hasBookPages ? { richmond_book_pages: richmondBookPages } : {}),
          ...(hasObsCal ? { observation_calendar: observationCalendar } : {}),
        })
        .select()
        .single()

      if (fortnightError) throw fortnightError

      // Best-effort updates (separate so one missing migration doesn't block the other).
      // Each is ignored (no throw) if its column isn't applied yet — creation never breaks.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      if (useSystemTemplate) {
        await sb.from('fortnights').update({ use_system_template: true }).eq('id', fortnight.id)
      }
      if (teacherNotes.trim() || projectNotes.trim()) {
        await sb
          .from('fortnights')
          .update({
            teacher_notes: teacherNotes.trim() || null,
            project_notes: projectNotes.trim() || null,
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
            {(['quincena', 'taller'] as const).map((t) => (
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
                {t === 'quincena' ? 'Quincena' : 'Taller'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {planType === 'quincena'
              ? 'Plan de 2 semanas con proyecto mensual, Letter & Number y Números'
              : 'Taller crítico independiente (1-3 sesiones específicas)'}
          </p>
        </Card>

        {/* Group Selection */}
        <Card className="p-6 border-2">
          <label htmlFor="group" className="block text-sm font-medium text-text-primary mb-2">
            Grupo
          </label>
          <select
            id="group"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            required
            className="w-full min-h-[44px] px-3 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Selecciona el grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.grade})
              </option>
            ))}
          </select>
        </Card>

        {/* Basic Info */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Información básica</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="number"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  {planType === 'quincena' ? 'Quincena #' : 'Taller #'}
                </label>
                <Input
                  id="number"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.number}
                  onChange={(e) => {
                    setFormData({ ...formData, number: e.target.value })
                    setFieldErrors({ ...fieldErrors, number: '' })
                  }}
                  required
                  className={`min-h-[44px] ${fieldErrors.number ? 'border-red-500' : ''}`}
                />
                {fieldErrors.number && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.number}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="monthly_value"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  Valor del mes
                </label>
                <Input
                  id="monthly_value"
                  value={formData.monthly_value}
                  onChange={(e) => {
                    setFormData({ ...formData, monthly_value: e.target.value })
                    setFieldErrors({ ...fieldErrors, monthly_value: '' })
                  }}
                  placeholder="Ej: Respeto"
                  required
                  className={`min-h-[44px] ${fieldErrors.monthly_value ? 'border-red-500' : ''}`}
                />
                {fieldErrors.monthly_value && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.monthly_value}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="project_name"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Nombre del proyecto
              </label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => {
                  setFormData({ ...formData, project_name: e.target.value })
                  setFieldErrors({ ...fieldErrors, project_name: '' })
                }}
                placeholder="Ej: Los animales de la granja"
                required
                className={`min-h-[44px] ${fieldErrors.project_name ? 'border-red-500' : ''}`}
              />
              {fieldErrors.project_name && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.project_name}
                </p>
              )}
            </div>
          </div>
        </Card>

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
        </Card>

        {/* Richmond Unit + Book Pages — only when dates filled */}
        {formData.start_date && formData.end_date && (
          <Card className="p-6 border-2">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Unidad Richmond <span className="font-normal text-text-secondary">(opcional)</span>
            </h3>
            <RichmondUnitSelector
              startDate={formData.start_date}
              endDate={formData.end_date}
              value={richmondUnit}
              onChange={setRichmondUnit}
            />
            {richmondUnit && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Páginas del libro
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(['student_book', 'activity_book', 'assessment'] as const).map((key) => (
                    <div key={key}>
                      <label className="block text-xs text-text-secondary mb-1">
                        {key === 'student_book'
                          ? 'Student Book'
                          : key === 'activity_book'
                            ? 'Activity Book'
                            : 'Assessment'}
                      </label>
                      <Input
                        value={richmondBookPages[key]}
                        onChange={(e) =>
                          setRichmondBookPages((p) => ({ ...p, [key]: e.target.value }))
                        }
                        placeholder="pp. 1-10"
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Letters — quincena only */}
        {planType === 'quincena' && (
          <Card className="p-6 border-2">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Letras a trabajar</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="letter_week1"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  Letra semana 1
                </label>
                <Input
                  id="letter_week1"
                  maxLength={1}
                  value={formData.letter_week1}
                  onChange={(e) => {
                    setFormData({ ...formData, letter_week1: e.target.value.toUpperCase() })
                    setFieldErrors({ ...fieldErrors, letter_week1: '' })
                  }}
                  placeholder="A"
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
                  Letra semana 2
                </label>
                <Input
                  id="letter_week2"
                  maxLength={1}
                  value={formData.letter_week2}
                  onChange={(e) => {
                    setFormData({ ...formData, letter_week2: e.target.value.toUpperCase() })
                    setFieldErrors({ ...fieldErrors, letter_week2: '' })
                  }}
                  placeholder="B"
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

        {/* Richmond unit (book catalog) — PRONI / Kinder 3 only */}
        {proniActive && (
          <UnitSelector onChange={setRichmondSelection} onResolved={setRichmondContent} />
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

        {/* Optional teacher details — general + project-specific */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Detalles adicionales <span className="font-normal text-text-secondary">(opcional)</span>
          </h3>
          <p className="text-xs text-text-secondary mb-3">
            Cualquier cosa específica que quieras que MaestraIA incluya. Entre más detalles, mejor.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                General (actividades, juegos o materiales específicos)
              </label>
              <textarea
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                rows={3}
                placeholder="Ej: Quiero incluir un juego de memoria el martes. Tengo plastilina y bloques."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Sobre el proyecto (descripción, ideas, productos)
              </label>
              <textarea
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                rows={3}
                placeholder="Ej: El proyecto trata sobre los animales del mar. Me gustaría que terminen con una maqueta."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
          </div>
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
