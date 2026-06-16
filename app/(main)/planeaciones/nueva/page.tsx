'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { z } from 'zod'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { RichmondUnitSelector } from '@/components/app/RichmondUnitSelector'

const FortnightSchema = z.object({
  number: z.number().min(1, 'Debe ser entre 1 y 12').max(12, 'Debe ser entre 1 y 12'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  project_name: z.string().min(1, 'El proyecto es requerido').max(200, 'Máximo 200 caracteres'),
  monthly_value: z.string().min(1, 'El valor es requerido').max(100, 'Máximo 100 caracteres'),
  letter_week1: z.string().length(1, 'Debe ser una sola letra'),
  letter_week2: z.string().length(1, 'Debe ser una sola letra'),
})

export default function NuevaPlaneacionPage() {
  const router = useRouter()
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
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [richmondUnit, setRichmondUnit] = useState('')
  const [allVocab, setAllVocab] = useState<{ id: string; word: string; letter: string }[]>([])
  const [selectedVocab, setSelectedVocab] = useState<string[]>([])
  const [extraMaterials, setExtraMaterials] = useState<string[]>([])
  const [manualMaterial, setManualMaterial] = useState('')

  useEffect(() => {
    loadGroups()
    fetch('/api/vocabulary')
      .then((r) => r.json())
      .then((d) => setAllVocab(d.items ?? []))
      .catch((err) => console.error('Failed to load vocabulary:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      // Get teacher
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

      // Get teacher's groups
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groupsData, error: groupsError } = await (supabase as any)
        .from('groups')
        .select('id, name, grade')
        .eq('titular_teacher_id', teacher.id)
        .order('name')

      if (groupsError) {
        console.error('Failed to load groups:', groupsError)
        setError('No pude cargar tus grupos. Por favor recarga la página.')
        setLoadingGroups(false)
        return
      }

      if (!groupsData || groupsData.length === 0) {
        // No groups - redirect to settings
        router.push('/configuracion?message=create_group_first')
        return
      }

      setGroups(groupsData)
      // Auto-select first group
      if (groupsData.length > 0) {
        setSelectedGroupId(groupsData[0].id)
      }
    } catch (err) {
      console.error('Error loading groups:', err)
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

      // Create fortnight with selected group
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fortnight, error: fortnightError } = await (supabase as any)
        .from('fortnights')
        .insert({
          teacher_id: teacher.id,
          group_id: selectedGroupId,
          ...validated,
          status: 'draft',
          vocabulary: selectedVocab.length > 0 ? selectedVocab : null,
          physical_materials: extraMaterials.length > 0 ? extraMaterials : null,
          ...(richmondUnit ? { richmond_unit: richmondUnit } : {}),
        })
        .select()
        .single()

      if (fortnightError) throw fortnightError

      router.push(`/planeaciones/${fortnight.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            errors[issue.path[0].toString()] = issue.message
          }
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
      <div className="p-8 max-w-2xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <Card className="p-6">
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Crear Nueva Planeación</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Group Selection Card */}
        <Card className="p-6 border-2">
          <div>
            <label htmlFor="group" className="block text-sm font-medium text-text-primary mb-2">
              Grupo
            </label>
            <select
              id="group"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-lg border border-border bg-surface text-text-primary
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Selecciona el grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.grade})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-text-secondary">
              El grupo para el cual se generará esta planeación
            </p>
          </div>
        </Card>

        {/* Basic Info Card */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Información básica</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="number"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  Quincena #
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
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.number}
                  </p>
                )}
                {!fieldErrors.number && (
                  <p className="mt-1.5 text-xs text-text-secondary">Entre 1 y 12</p>
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
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.monthly_value}
                  </p>
                )}
                {!fieldErrors.monthly_value && (
                  <p className="mt-1.5 text-xs text-text-secondary">Valor a trabajar este mes</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Dates Card */}
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
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.start_date}
                </p>
              )}
              {!fieldErrors.start_date && (
                <p className="mt-1.5 text-xs text-text-secondary">Primer día de la quincena</p>
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
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.end_date}
                </p>
              )}
              {!fieldErrors.end_date && (
                <p className="mt-1.5 text-xs text-text-secondary">Último día de la quincena</p>
              )}
            </div>
          </div>
        </Card>

        {/* Richmond Unit Card — only when dates are filled */}
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
          </Card>
        )}

        {/* Project Card */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Proyecto mensual</h3>
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
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.project_name}
              </p>
            )}
            {!fieldErrors.project_name && (
              <p className="mt-1.5 text-xs text-text-secondary">
                Tema transversal que se trabajará durante el mes
              </p>
            )}
          </div>
        </Card>

        {/* Letters Card */}
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
                required
                className={`min-h-[44px] ${fieldErrors.letter_week1 ? 'border-red-500' : ''}`}
              />
              {fieldErrors.letter_week1 && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.letter_week1}
                </p>
              )}
              {!fieldErrors.letter_week1 && (
                <p className="mt-1.5 text-xs text-text-secondary">Primera semana (martes)</p>
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
                required
                className={`min-h-[44px] ${fieldErrors.letter_week2 ? 'border-red-500' : ''}`}
              />
              {fieldErrors.letter_week2 && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.letter_week2}
                </p>
              )}
              {!fieldErrors.letter_week2 && (
                <p className="mt-1.5 text-xs text-text-secondary">Segunda semana (martes)</p>
              )}
            </div>
          </div>
        </Card>

        {/* Vocabulary Card */}
        {allVocab.length > 0 && (
          <Card className="p-6 border-2">
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Vocabulario <span className="font-normal text-text-secondary">(opcional)</span>
            </h3>
            <p className="text-xs text-text-secondary mb-3">
              Selecciona las palabras que Claude usará al generar las actividades
            </p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {allVocab.map((v) => {
                const selected = selectedVocab.includes(v.word)
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      setSelectedVocab((prev) =>
                        selected ? prev.filter((w) => w !== v.word) : [...prev, v.word]
                      )
                    }
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      selected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-text-secondary border-border hover:border-primary'
                    }`}
                  >
                    {selected && <X size={10} className="inline mr-1" />}
                    {v.word}
                  </button>
                )
              })}
            </div>
            {selectedVocab.length > 0 && (
              <p className="text-xs text-primary mt-2">
                {selectedVocab.length} palabra{selectedVocab.length !== 1 ? 's' : ''} seleccionada
                {selectedVocab.length !== 1 ? 's' : ''}
              </p>
            )}
          </Card>
        )}

        {/* Materials Card */}
        <Card className="p-6 border-2">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Materiales extras <span className="font-normal text-text-secondary">(opcional)</span>
          </h3>
          <p className="text-xs text-text-secondary mb-3">
            Base siempre disponible: pizarrón, crayones, hojas, proyector, tijeras, pegamento,
            flashcards MaestraAI. Agrega lo que tienes de más esta quincena.
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
                    className="ml-1 hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

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
