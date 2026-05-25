'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Sparkles, Download } from 'lucide-react'
import { LoadingGeneration } from '@/components/app/LoadingGeneration'

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

export default function PlaneacionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [fortnight, setFortnight] = useState<Fortnight | null>(null)
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([])
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationPhase, setGenerationPhase] = useState<
    'preparing' | 'analyzing' | 'generating' | 'done'
  >('preparing')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadData() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fortnightData } = await (supabase as any)
      .from('fortnights')
      .select('*')
      .eq('id', params.id)
      .single()

    setFortnight(fortnightData)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plansData } = await (supabase as any)
      .from('lesson_plans')
      .select('*')
      .eq('fortnight_id', params.id)
      .order('day_number', { ascending: true })

    setLessonPlans(plansData || [])
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

  function getDayLabel(dayNumber: number): string {
    const weekDay = ((dayNumber - 1) % 5) + 1
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    return days[weekDay - 1]
  }

  if (!fortnight) {
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
      <div className="mb-6 flex items-center justify-between">
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
            <Button variant="outline" className="min-h-[44px]">
              <Download size={16} className="mr-2" />
              Exportar PDF
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
          {lessonPlans.map((plan) => (
            <Card
              key={plan.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() =>
                setExpandedDay(expandedDay === plan.day_number ? null : plan.day_number)
              }
            >
              <div className="p-4 flex items-center justify-between">
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
                {expandedDay === plan.day_number ? (
                  <ChevronUp size={20} className="text-text-secondary" />
                ) : (
                  <ChevronDown size={20} className="text-text-secondary" />
                )}
              </div>

              {expandedDay === plan.day_number && (
                <div className="border-t border-border p-6 bg-bg space-y-4">
                  {plan.blocks.map((block, idx) => (
                    <div key={idx} className="bg-surface p-4 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{block.time}</p>
                          <h4 className="text-base font-semibold text-text-primary mt-1">
                            {block.activity}
                          </h4>
                        </div>
                        <span className="text-xs bg-primary-light text-primary px-2 py-1 rounded">
                          {block.methodology}
                        </span>
                      </div>

                      {block.materials && block.materials.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-text-secondary mb-1">
                            Materiales:
                          </p>
                          <p className="text-sm text-text-primary">{block.materials.join(', ')}</p>
                        </div>
                      )}

                      <div className="mt-3 flex gap-4 text-xs text-text-secondary">
                        <span>Campo: {block.nem_field}</span>
                        <span>Eje: {block.nem_axis}</span>
                      </div>
                    </div>
                  ))}

                  {plan.vocabulary && plan.vocabulary.length > 0 && (
                    <div className="bg-primary-light p-4 rounded-lg">
                      <p className="text-xs font-medium text-text-secondary mb-2">
                        Vocabulario del día:
                      </p>
                      <p className="text-sm text-text-primary">{plan.vocabulary.join(', ')}</p>
                    </div>
                  )}

                  {plan.observation_students && plan.observation_students.length > 0 && (
                    <div className="bg-accent/10 p-4 rounded-lg">
                      <p className="text-xs font-medium text-text-secondary mb-2">Observar hoy:</p>
                      <p className="text-sm text-text-primary">
                        {plan.observation_students.join(', ')}
                      </p>
                    </div>
                  )}

                  {plan.nee_reminders && plan.nee_reminders.length > 0 && (
                    <div className="bg-warning/10 p-4 rounded-lg">
                      <p className="text-xs font-medium text-text-secondary mb-2">
                        Recordatorios NEE:
                      </p>
                      <ul className="text-sm text-text-primary space-y-1">
                        {plan.nee_reminders.map((reminder, idx) => (
                          <li key={idx}>• {reminder}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
