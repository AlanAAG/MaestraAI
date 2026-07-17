// components/app/LoadingGeneration.tsx
'use client'
import { motion } from 'framer-motion'
import { Check, Loader2, Sparkles } from 'lucide-react'

interface LoadingGenerationProps {
  phase: 'preparing' | 'analyzing' | 'generating' | 'subplanes' | 'done'
}

// Ordered steps (the visible journey); 'done' is the terminal state.
const STEPS: { key: LoadingGenerationProps['phase']; label: string; desc: string }[] = [
  {
    key: 'preparing',
    label: 'Preparando',
    desc: 'Proyecto del mes, valores y fechas',
  },
  {
    key: 'analyzing',
    label: 'Alineando con la NEM',
    desc: 'Campos formativos, ejes y vocabulario',
  },
  {
    key: 'generating',
    label: 'Redactando con tu voz',
    desc: 'Tu estilo, proyecto, ajustes y evaluación',
  },
  {
    key: 'subplanes',
    label: 'Sub-planeaciones',
    desc: 'Letter & Number y Números, con sus momentos',
  },
]

export function LoadingGeneration({ phase }: LoadingGenerationProps) {
  const done = phase === 'done'
  const activeIndex = done ? STEPS.length : STEPS.findIndex((s) => s.key === phase)
  const progress = done ? 1 : (activeIndex + 0.5) / STEPS.length

  return (
    <div className="mx-auto flex min-h-[440px] w-full max-w-md flex-col items-center justify-center px-4">
      {/* Hero icon */}
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
        {/* soft pulsing halo */}
        <motion.span
          className="absolute inset-0 rounded-full bg-brand/15"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30"
          animate={done ? { scale: [1, 1.1, 1] } : { rotate: [0, 8, -8, 0] }}
          transition={
            done ? { duration: 0.5 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          {done ? <Check size={36} strokeWidth={3} /> : <Sparkles size={34} />}
        </motion.div>
      </div>

      <motion.h2
        key={done ? 'done' : 'loading'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xl font-semibold text-text-primary"
      >
        {done ? '¡Tu planeación está lista! ✨' : 'Creando tu planeación'}
      </motion.h2>
      <p className="mt-1 text-center text-sm text-text-secondary">
        {done
          ? 'Escrita en tu estilo y alineada a la NEM.'
          : 'MaestraIA está escribiendo un documento completo en tu voz.'}
      </p>

      {/* Progress bar */}
      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-inset">
        <motion.div
          className="h-full rounded-full bg-brand"
          initial={false}
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      {/* Steps */}
      <div className="mt-6 w-full space-y-2.5">
        {STEPS.map((step, i) => {
          const state = done || i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: state === 'pending' ? 0.5 : 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                state === 'active'
                  ? 'border-brand/30 bg-brand-subtle'
                  : 'border-transparent bg-transparent'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  state === 'done'
                    ? 'bg-brand text-white'
                    : state === 'active'
                      ? 'bg-brand-subtle text-brand'
                      : 'bg-inset text-text-disabled'
                }`}
              >
                {state === 'done' ? (
                  <Check size={15} strokeWidth={3} />
                ) : state === 'active' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${state === 'pending' ? 'text-text-secondary' : 'text-text-primary'}`}
                >
                  {step.label}
                </p>
                <p className="truncate text-xs text-text-secondary">{step.desc}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {!done && (
        <p className="mt-5 text-center text-xs text-text-disabled">
          Una planeación completa toma 1–2 minutos. No cierres esta página.
        </p>
      )}
    </div>
  )
}
