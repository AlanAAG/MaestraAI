'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Phase = 'init' | 'plans' | 'materials' | 'complete' | 'error'

const PLAN_PHASE_LABELS: Record<string, string> = {
  preparing: 'Preparando quincena...',
  analyzing: 'Analizando el proyecto...',
  generating: 'Escribiendo 10 días de actividades...',
}

interface Props {
  fortnightId: string
  hasPlans: boolean
  onComplete: () => void
  onCancel: () => void
}

function DayTile({
  day,
  isActive,
  isDone,
  isFailed,
  noVocab,
}: {
  day: number
  isActive: boolean
  isDone: boolean
  isFailed: boolean
  noVocab: boolean
}) {
  const base =
    'flex items-center justify-center rounded-xl border-2 h-12 w-12 text-sm font-semibold transition-all duration-300'
  const color = isDone
    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
    : isFailed
      ? 'border-red-300 bg-red-50 text-red-500'
      : isActive
        ? 'border-indigo-400 bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-200'
        : noVocab
          ? 'border-dashed border-gray-200 bg-gray-50 text-gray-300'
          : 'border-gray-200 bg-white text-gray-400'

  return (
    <div className={`${base} ${color}`}>
      {isDone ? (
        <CheckCircle className="h-5 w-5 text-emerald-500" />
      ) : isFailed ? (
        <XCircle className="h-5 w-5 text-red-400" />
      ) : isActive ? (
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      ) : (
        <span>{day}</span>
      )}
    </div>
  )
}

export function FortnightPackProgress({ fortnightId, hasPlans, onComplete, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>('init')
  const [planPhaseLabel, setPlanPhaseLabel] = useState('')
  const [plansDone, setPlansDone] = useState(hasPlans)
  const [currentDay, setCurrentDay] = useState<number | null>(null)
  const [daysComplete, setDaysComplete] = useState<Set<number>>(new Set())
  const [daysFailed, setDaysFailed] = useState<Set<number>>(new Set())
  const [noVocabDays, setNoVocabDays] = useState<Set<number>>(new Set())
  const [totalDays, setTotalDays] = useState(10)
  const [errorMsg, setErrorMsg] = useState('')
  const abortRef = useRef(new AbortController())

  useEffect(() => {
    const ac = new AbortController()
    abortRef.current = ac
    run(ac.signal).catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('FortnightPackProgress:', err)
      setErrorMsg('Ocurrió un error. El progreso se guardó — puedes intentarlo de nuevo.')
      setPhase('error')
    })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function patchPack(
    id: string,
    updates: { status?: string; progress?: object; materials_state?: Record<string, string> },
    signal: AbortSignal
  ) {
    try {
      await fetch(`/api/fortnight-packs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal,
      })
    } catch {
      // Non-fatal: progress persisted on best-effort basis
    }
  }

  function buildMaterialsState(
    done: Set<number>,
    failed: Set<number>,
    total: number
  ): Record<string, string> {
    const state: Record<string, string> = {}
    for (let d = 1; d <= total; d++) {
      if (done.has(d)) state[String(d)] = 'done'
      else if (failed.has(d)) state[String(d)] = 'failed'
    }
    return state
  }

  async function streamPlanGeneration(signal: AbortSignal) {
    const res = await fetch('/api/planner/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fortnight_id: fortnightId }),
      signal,
    })
    if (!res.ok) throw new Error('Error al crear planeación')

    const reader = res.body?.getReader()
    if (!reader) throw new Error('Sin lector de stream')
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as { phase?: string }
          if (parsed.phase) {
            setPlanPhaseLabel(PLAN_PHASE_LABELS[parsed.phase] ?? parsed.phase)
          }
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }
  }

  async function run(signal: AbortSignal) {
    // 1. Create or resume pack
    const packRes = await fetch('/api/fortnight-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fortnight_id: fortnightId }),
      signal,
    })
    if (!packRes.ok) throw new Error('Error al iniciar')
    const { pack_id, progress } = (await packRes.json()) as {
      pack_id: string
      progress: { plans_done?: boolean; days_complete?: number[]; days_failed?: number[] }
    }

    const prevDone = new Set<number>(progress?.days_complete ?? [])
    const prevFailed = new Set<number>(progress?.days_failed ?? [])
    const plansDoneDB = (progress?.plans_done ?? false) || hasPlans

    setDaysComplete(new Set(prevDone))
    setDaysFailed(new Set(prevFailed))

    // 2. Generate plans if needed
    if (!plansDoneDB) {
      setPhase('plans')
      setPlansDone(false)
      await streamPlanGeneration(signal)
      setPlansDone(true)
      await patchPack(
        pack_id,
        {
          progress: {
            plans_done: true,
            days_complete: Array.from(prevDone),
            days_failed: Array.from(prevFailed),
          },
        },
        signal
      )
    } else {
      setPlansDone(true)
    }

    // 3. Fetch lesson plans
    setPhase('materials')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plans } = await (supabase as any)
      .from('lesson_plans')
      .select('id, day_number, vocabulary')
      .eq('fortnight_id', fortnightId)
      .order('day_number')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPlans: Array<{ id: string; day_number: number; vocabulary: string[] }> = plans ?? []
    setTotalDays(allPlans.length || 10)

    const noVocab = new Set(
      allPlans.filter((p) => (p.vocabulary ?? []).length === 0).map((p) => p.day_number)
    )
    setNoVocabDays(noVocab)

    const doneSet = new Set(prevDone)
    const failedSet = new Set(prevFailed)

    // 4. Generate materials sequentially per day
    for (const plan of allPlans) {
      if (doneSet.has(plan.day_number)) continue
      if (noVocab.has(plan.day_number)) continue

      setCurrentDay(plan.day_number)

      try {
        const res = await fetch('/api/materials/generate-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lesson_plan_id: plan.id }),
          signal,
        })
        if (!res.ok) throw new Error(`Day ${plan.day_number} failed`)

        doneSet.add(plan.day_number)
        setDaysComplete(new Set(doneSet))
        await patchPack(
          pack_id,
          {
            progress: {
              plans_done: true,
              days_complete: Array.from(doneSet),
              days_failed: Array.from(failedSet),
            },
            materials_state: buildMaterialsState(doneSet, failedSet, allPlans.length),
          },
          signal
        )
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err
        failedSet.add(plan.day_number)
        setDaysFailed(new Set(failedSet))
      }
    }

    setCurrentDay(null)

    const finalStatus = doneSet.size === 0 && failedSet.size > 0 ? 'error' : 'ready'
    await patchPack(
      pack_id,
      {
        status: finalStatus,
        progress: {
          plans_done: true,
          days_complete: Array.from(doneSet),
          days_failed: Array.from(failedSet),
        },
        materials_state: buildMaterialsState(doneSet, failedSet, allPlans.length),
      },
      signal
    )

    setPhase('complete')
    setTimeout(() => onComplete(), 1200)
  }

  const isPlansActive = phase === 'plans'
  const isMaterialsActive = phase === 'materials' || phase === 'complete'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generar Quincena Completa</h2>
            <p className="text-xs text-gray-400">Planeación + materiales para los 10 días</p>
          </div>
        </div>

        {/* Step 1 — Plans */}
        <div className="flex items-start gap-3 mb-5">
          <div className="mt-0.5 shrink-0">
            {plansDone ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : isPlansActive ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
            )}
          </div>
          <div>
            <p
              className={`text-sm font-medium ${plansDone ? 'text-gray-500' : isPlansActive ? 'text-gray-900' : 'text-gray-400'}`}
            >
              Paso 1 — Crear planeación
            </p>
            {isPlansActive && planPhaseLabel && (
              <p className="text-xs text-indigo-500 mt-0.5">{planPhaseLabel}</p>
            )}
            {plansDone && <p className="text-xs text-gray-400 mt-0.5">10 días generados</p>}
          </div>
        </div>

        {/* Step 2 — Materials */}
        <div className="flex items-start gap-3 mb-6">
          <div className="mt-0.5 shrink-0">
            {phase === 'complete' ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : isMaterialsActive ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={`text-sm font-medium mb-3 ${isMaterialsActive ? 'text-gray-900' : 'text-gray-400'}`}
            >
              Paso 2 — Generar materiales
              {isMaterialsActive && totalDays > 0 && (
                <span className="font-normal text-gray-400 ml-1">
                  ({daysComplete.size}/{totalDays} días)
                </span>
              )}
            </p>

            {/* Day grid */}
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                <DayTile
                  key={day}
                  day={day}
                  isActive={currentDay === day}
                  isDone={daysComplete.has(day)}
                  isFailed={daysFailed.has(day)}
                  noVocab={noVocabDays.has(day)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {phase === 'complete' ? (
          <p className="text-center text-sm text-emerald-600 font-medium">
            ¡Quincena completa lista!
          </p>
        ) : phase === 'error' ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-red-500">{errorMsg}</p>
            <div className="text-center">
              <button
                onClick={onCancel}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Esto puede tardar unos minutos...</p>
            <button
              onClick={() => {
                abortRef.current.abort()
                onCancel()
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
