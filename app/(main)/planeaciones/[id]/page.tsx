'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ChevronDown,
  Sparkles,
  Download,
  ArrowLeft,
  BookOpen,
  Eye,
  Heart,
  Edit2,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { LoadingGeneration } from '@/components/app/LoadingGeneration'
import { LessonPlanEditor } from '@/components/app/LessonPlanEditor'
import { MaterialGenerator } from '@/components/app/MaterialGenerator'

const TYPE_LABELS: Record<string, string> = {
  flashcards: 'Flashcards',
  memory_game: 'Memorama',
  bingo: 'Bingo',
  word_search: 'Sopa de Letras',
  song_worksheet: 'Canción',
  letter_recognition: 'Reconoc. Letras',
  matching: 'Matching',
  youtube: 'Videos YouTube',
  worksheet: 'Hoja de Trabajo',
  worksheets: 'Hoja de Trabajo',
}

type LessonBlock = {
  time: string
  activity: string
  methodology: string
  materials: string[]
  nem_field: string
  nem_axis: string
}

type LessonPlan = {
  id: string
  day_number: number
  date: string
  day_of_week: string
  blocks: LessonBlock[]
  vocabulary: string[]
  observation_students: string[]
  nee_reminders: string[]
  approved: boolean
}

type Fortnight = {
  id: string
  number: number
  start_date: string
  end_date: string
  project_name: string
  monthly_value: string
  letter_week1: string
  letter_week2: string
  status: string
}

type VocabularyItem = {
  id: string
  word: string
  letter: string
}

export default function PlaneacionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [fortnight, setFortnight] = useState<Fortnight | null>(null)
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([])
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [generationPhase, setGenerationPhase] = useState<
    'preparing' | 'analyzing' | 'generating' | 'done'
  >('preparing')
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([])
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [showMaterialGenerator, setShowMaterialGenerator] = useState(false)
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState<string | null>(null)
  const [materialsByPlan, setMaterialsByPlan] = useState<
    Record<string, { id: string; type: string }[]>
  >({})
  const [fortnightMaterials, setFortnightMaterials] = useState<{ id: string; type: string }[]>([])
  const [youtubeInputPlanId, setYoutubeInputPlanId] = useState<string | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [addingYoutube, setAddingYoutube] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadData() {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error:', authError)
        router.push('/login')
        return
      }

      if (!user) {
        console.error('No user found')
        router.push('/login')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fortnightData, error: fortnightError } = await (supabase as any)
        .from('fortnights')
        .select('*')
        .eq('id', params.id)
        .single()

      if (fortnightError) {
        console.error('Fortnight query error:', fortnightError)
        setLoading(false)
        return
      }

      setFortnight(fortnightData)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: plansData, error: plansError } = await (supabase as any)
        .from('lesson_plans')
        .select('*')
        .eq('fortnight_id', params.id)
        .order('day_number', { ascending: true })

      if (plansError) {
        console.error('Lesson plans query error:', plansError)
      }

      setLessonPlans(plansData || [])

      // Fetch materials linked to lesson plans
      const planIds = (plansData || []).map((p: { id: string }) => p.id)
      if (planIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: planMats } = await (supabase as any)
          .from('materials')
          .select('id, type, lesson_plan_id')
          .in('lesson_plan_id', planIds)
        const byPlan: Record<string, { id: string; type: string }[]> = {}
        for (const m of planMats ?? []) {
          if (m.lesson_plan_id) {
            byPlan[m.lesson_plan_id] ??= []
            byPlan[m.lesson_plan_id].push({ id: m.id, type: m.type })
          }
        }
        setMaterialsByPlan(byPlan)
      }

      // Fetch fortnight-level materials (bingo, word_search — no lesson_plan_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fMats } = await (supabase as any)
        .from('materials')
        .select('id, type')
        .eq('fortnight_id', params.id)
        .is('lesson_plan_id', null)
      setFortnightMaterials(fMats ?? [])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: vocabData } = await (supabase as any)
        .from('vocabulary_items')
        .select('id, word, letter')
        .order('word', { ascending: true })

      setVocabularyItems(vocabData || [])
      setLoading(false)
    } catch (err) {
      console.error('Unexpected error loading fortnight:', err)
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (!fortnight) return

    setGenerating(true)
    setGenerationPhase('preparing')

    try {
      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fortnight_id: fortnight.id,
        }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          const data = line.slice(6)
          if (data === '[DONE]') {
            setGenerationPhase('done')
            await loadData()
            setTimeout(() => setGenerating(false), 1500)
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.phase) {
              setGenerationPhase(parsed.phase)
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error)
      setGenerating(false)
    }
  }

  async function handleExportPdf() {
    if (!fortnight) return

    setExportingPdf(true)
    try {
      const response = await fetch('/api/planner/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fortnight_id: fortnight.id,
        }),
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Planeacion_Quincena_${fortnight.number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF export error:', error)
    } finally {
      setExportingPdf(false)
    }
  }

  function getDayLabel(dayNumber: number): string {
    const weekDay = ((dayNumber - 1) % 5) + 1
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    return days[weekDay - 1]
  }

  function getMethodologyColor(methodology: string): string {
    const colorMap: Record<string, string> = {
      'Aprendizaje Basado en Proyectos': 'bg-blue-100 text-blue-700',
      Juego: 'bg-purple-100 text-purple-700',
      Rutina: 'bg-gray-100 text-gray-700',
      'Actividad Dirigida': 'bg-green-100 text-green-700',
      Exploración: 'bg-yellow-100 text-yellow-700',
      Cierre: 'bg-orange-100 text-orange-700',
    }
    return colorMap[methodology] || 'bg-primary-light text-primary'
  }

  function handleSavePlan(updatedPlan: LessonPlan) {
    setLessonPlans((prev) => prev.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)))
    setEditingPlanId(null)
  }

  async function handleAddYoutube(planId: string) {
    const url = youtubeUrl.trim()
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return
    setAddingYoutube(true)
    try {
      const res = await fetch('/api/materials/from-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, lesson_plan_id: planId }),
      })
      if (res.ok) {
        setYoutubeUrl('')
        setYoutubeInputPlanId(null)
        loadData()
      }
    } catch {
      // silently fail — teacher can retry
    } finally {
      setAddingYoutube(false)
    }
  }

  if (loading || !fortnight) {
    return (
      <div className="p-8">
        <p className="text-text-secondary">Cargando...</p>
      </div>
    )
  }

  if (generating) {
    return (
      <div className="p-8">
        <LoadingGeneration phase={generationPhase} />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/planeaciones')} className="mb-4 -ml-2">
          <ArrowLeft size={16} className="mr-2" />
          Volver a Planeaciones
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Quincena {fortnight.number}: {fortnight.project_name}
            </h1>
            <p className="text-text-secondary mt-1">
              {new Date(fortnight.start_date).toLocaleDateString('es-MX')} -{' '}
              {new Date(fortnight.end_date).toLocaleDateString('es-MX')}
            </p>
          </div>
          <div className="flex gap-3">
            {lessonPlans.length > 0 && (
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={handleExportPdf}
                disabled={exportingPdf}
              >
                <Download size={16} className="mr-2" />
                {exportingPdf ? 'Descargando...' : 'Descargar PDF'}
              </Button>
            )}
            {lessonPlans.length === 0 && (
              <Button
                onClick={handleGenerate}
                className="min-h-[44px] bg-primary hover:bg-primary-dark"
              >
                <Sparkles size={16} className="mr-2" />
                Generar Planeación
              </Button>
            )}
          </div>
        </div>
      </div>

      {lessonPlans.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles size={48} className="mx-auto mb-4 text-primary" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Planeación lista para generar
          </h2>
          <p className="text-text-secondary mb-6">
            La IA creará 10 días de planeaciones alineadas a NEM y tu cronograma fijo
          </p>
          <Button
            onClick={handleGenerate}
            className="min-h-[44px] bg-primary hover:bg-primary-dark"
          >
            <Sparkles size={16} className="mr-2" />
            Generar Planeación
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {fortnightMaterials.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-xs text-gray-500 font-medium">Materiales de la quincena:</span>
              {fortnightMaterials.map((m) => (
                <Link key={m.id} href={`/materiales/${m.id}`}>
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer">
                    {TYPE_LABELS[m.type] ?? m.type}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {lessonPlans.map((plan) => {
            const isExpanded = expandedDay === plan.day_number
            const isEditing = editingPlanId === plan.id
            return (
              <Card key={plan.id} className="overflow-hidden transition-all duration-200">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-bg/50"
                  onClick={() => !isEditing && setExpandedDay(isExpanded ? null : plan.day_number)}
                >
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      Día {plan.day_number} - {getDayLabel(plan.day_number)}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {new Date(plan.date).toLocaleDateString('es-MX', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded && !isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingPlanId(plan.id)
                        }}
                        className="h-8"
                      >
                        <Edit2 size={14} className="mr-1" />
                        Modificar
                      </Button>
                    )}
                    <div
                      className={`transform transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      <ChevronDown size={20} className="text-text-secondary" />
                    </div>
                  </div>
                </div>

                {isExpanded && !isEditing && (
                  <div className="border-t border-border p-6 bg-bg space-y-4 animate-in slide-in-from-top-2">
                    {plan.blocks.map((block, idx) => (
                      <div key={idx} className="bg-surface p-4 rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-text-secondary">{block.time}</p>
                            <h4 className="text-base font-semibold text-text-primary mt-1">
                              {block.activity}
                            </h4>
                            {block.activity.includes('[PRONI:') && (
                              <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                PRONI
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${getMethodologyColor(block.methodology)}`}
                          >
                            {block.methodology}
                          </span>
                        </div>

                        {block.materials && block.materials.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs font-semibold text-text-secondary mb-1.5">
                              Materiales
                            </p>
                            <p className="text-sm text-text-primary">
                              {block.materials.join(', ')}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-border flex gap-6 text-xs">
                          <div>
                            <span className="font-semibold text-text-secondary">Campo: </span>
                            <span className="text-text-primary">{block.nem_field}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-text-secondary">Eje: </span>
                            <span className="text-text-primary">{block.nem_axis}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {plan.vocabulary && plan.vocabulary.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen size={16} className="text-blue-600" />
                          <p className="text-xs font-semibold text-blue-900">Vocabulario del día</p>
                        </div>
                        <p className="text-sm text-blue-800">{plan.vocabulary.join(', ')}</p>
                      </div>
                    )}

                    {plan.observation_students && plan.observation_students.length > 0 && (
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye size={16} className="text-purple-600" />
                          <p className="text-xs font-semibold text-purple-900">Observar hoy</p>
                        </div>
                        <p className="text-sm text-purple-800">
                          {plan.observation_students.join(', ')}
                        </p>
                      </div>
                    )}

                    {plan.nee_reminders && plan.nee_reminders.length > 0 && (
                      <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart size={16} className="text-rose-600" />
                          <p className="text-xs font-semibold text-rose-900">Recordatorios NEE</p>
                        </div>
                        <ul className="text-sm text-rose-800 space-y-1">
                          {plan.nee_reminders.map((reminder, idx) => (
                            <li key={idx}>• {reminder}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border space-y-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLessonPlanId(plan.id)
                          setShowMaterialGenerator(true)
                        }}
                      >
                        <Package size={16} className="mr-2" />
                        Crear materiales
                      </Button>
                      {materialsByPlan[plan.id]?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {materialsByPlan[plan.id].map((m) => (
                            <Link
                              key={m.id}
                              href={`/materiales/${m.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer">
                                {TYPE_LABELS[m.type] ?? m.type}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {/* YouTube quick-add */}
                      {youtubeInputPlanId === plan.id ? (
                        <div
                          className="flex gap-2 items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="url"
                            placeholder="https://youtube.com/watch?v=..."
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            className="flex-1 text-xs px-2 py-1.5 rounded border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            disabled={addingYoutube}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddYoutube(plan.id)
                            }}
                            className="min-h-[36px] text-xs"
                          >
                            Agregar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              setYoutubeInputPlanId(null)
                              setYoutubeUrl('')
                            }}
                            className="min-h-[36px] text-xs"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setYoutubeInputPlanId(plan.id)
                          }}
                          className="text-xs text-text-secondary hover:text-primary transition-colors cursor-pointer"
                        >
                          + Agregar canción de YouTube
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="border-t border-border p-4 bg-bg">
                    <LessonPlanEditor
                      lessonPlan={plan}
                      vocabularyItems={vocabularyItems}
                      onSave={handleSavePlan}
                      onCancel={() => setEditingPlanId(null)}
                    />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {showMaterialGenerator && selectedLessonPlanId && fortnight && (
        <MaterialGenerator
          lessonPlanId={selectedLessonPlanId}
          fortnightId={fortnight.id}
          onClose={() => {
            setShowMaterialGenerator(false)
            setSelectedLessonPlanId(null)
          }}
          onSuccess={() => {
            setShowMaterialGenerator(false)
            setSelectedLessonPlanId(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
