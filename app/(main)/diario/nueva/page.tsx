'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const QUESTIONS = [
  {
    id: 'q1' as const,
    label: '¿Qué funcionó bien esta semana?',
    placeholder: 'Por ejemplo: Los niños respondieron bien a la actividad de...',
  },
  {
    id: 'q2' as const,
    label: '¿Qué fue retador?',
    placeholder: 'Por ejemplo: Me costó trabajo mantener la atención durante...',
  },
  {
    id: 'q3' as const,
    label: '¿Cómo respondió el grupo a las actividades?',
    placeholder: 'Por ejemplo: La mayoría participó activamente, aunque...',
  },
  {
    id: 'q4' as const,
    label: '¿Qué necesito ajustar para la próxima semana?',
    placeholder: 'Por ejemplo: Voy a dedicar más tiempo a...',
  },
  {
    id: 'q5' as const,
    label: '¿Hay algo sobre algún alumno que quieras recordar?',
    placeholder: 'Por ejemplo: Un alumno mostró interés especial en...',
    optional: true,
  },
]

type AnswerKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5'
type Answers = Record<AnswerKey, string>

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { weekStart: fmt(monday), weekEnd: fmt(friday) }
}

const LS_KEY = 'maestraai_diary_draft'

export default function NuevaDiarioPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({ q1: '', q2: '', q3: '', q4: '', q5: '' })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Answers>
        setAnswers((prev) => ({ ...prev, ...parsed }))
      } catch {
        // ignore malformed draft
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(answers))
  }, [answers])

  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [step])

  const current = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1
  const isFirst = step === 0

  const handleNext = () => {
    if (isLast) {
      const { weekStart, weekEnd } = getWeekBounds()
      const params = new URLSearchParams({ ...answers, weekStart, weekEnd })
      router.push(`/diario/resultado?${params.toString()}`)
    } else {
      setStep((s) => s + 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleNext()
  }

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-8 py-12">
      <div className="mb-6 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
        Tip: evita incluir nombres completos de alumnos en tus respuestas.
      </div>

      <div className="mb-10 space-y-3">
        <div className="flex justify-between text-sm text-text-secondary">
          <span>
            Pregunta {step + 1} de {QUESTIONS.length}
          </span>
          {current.optional && <span className="text-text-disabled">Opcional</span>}
        </div>
        <div className="h-1.5 bg-primary-light rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <label className="block text-xl font-semibold text-text-primary leading-snug">
            {current.label}
          </label>
          <Textarea
            ref={textareaRef}
            value={answers[current.id]}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
            onKeyDown={handleKeyDown}
            placeholder={current.placeholder}
            className="min-h-[120px] max-h-[200px] resize-y text-base leading-relaxed rounded-xl"
          />
          <p className="text-xs text-text-disabled">⌘+Enter para continuar</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={isFirst}
          className="min-h-[44px] gap-1 text-text-secondary"
        >
          <ChevronLeft size={18} />
          Anterior
        </Button>

        <Button
          onClick={handleNext}
          className="min-h-[44px] px-6 text-[15px] font-semibold rounded-xl gap-1 bg-primary text-white hover:bg-primary-dark transition-colors duration-150"
        >
          {isLast ? 'Generar mi diario' : 'Siguiente'}
          {!isLast && <ChevronRight size={18} />}
        </Button>
      </div>
    </main>
  )
}
