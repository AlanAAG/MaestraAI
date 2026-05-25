'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    question: '¿Cómo te llamas?',
    field: 'full_name',
    placeholder: 'Ej: María García',
  },
  {
    question: '¿Qué grado enseñas?',
    field: 'grade',
    placeholder: 'Ej: Kinder 3',
  },
  {
    question: '¿Qué editorial usas?',
    field: 'editorial',
    placeholder: 'Ej: Richmond, Macmillan',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({ full_name: '', grade: '', editorial: '' })
  const [loading, setLoading] = useState(false)

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  async function handleNext() {
    if (isLast) {
      setLoading(true)
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('teachers').insert({
        auth_id: user.id,
        full_name: answers.full_name,
        email: user.email!,
        role: 'titular',
      })

      router.push('/dashboard')
    } else {
      setStep(step + 1)
    }
  }

  function handleSkip() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-text-secondary">
            Paso {step + 1} de {STEPS.length}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-2xl font-semibold text-text-primary mb-6">
              {currentStep.question}
            </h1>

            <Input
              value={answers[currentStep.field as keyof typeof answers]}
              onChange={(e) =>
                setAnswers({ ...answers, [currentStep.field]: e.target.value })
              }
              placeholder={currentStep.placeholder}
              className="mb-6 min-h-[44px]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNext()
              }}
            />

            <div className="flex gap-3">
              <Button
                onClick={handleNext}
                disabled={!answers[currentStep.field as keyof typeof answers] || loading}
                className="flex-1 min-h-[44px] bg-primary hover:bg-primary-dark"
              >
                {isLast ? (loading ? 'Guardando...' : 'Finalizar') : 'Siguiente'}
              </Button>
              <Button
                onClick={handleSkip}
                variant="outline"
                className="min-h-[44px]"
              >
                Omitir
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
