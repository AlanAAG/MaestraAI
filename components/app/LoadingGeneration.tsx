// components/app/LoadingGeneration.tsx
'use client'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle } from 'lucide-react'

interface LoadingGenerationProps {
  phase: 'preparing' | 'analyzing' | 'generating' | 'done'
}

const PHASE_LABELS = {
  preparing: 'Preparando tu quincena...',
  analyzing: 'Revisando vocabulario y NEM...',
  generating: 'Creando 10 días de actividades...',
  done: '¡Planeación lista!',
}

const PHASE_DESCRIPTIONS = {
  preparing: 'Configurando el proyecto mensual y los valores',
  analyzing: 'Alineando campos formativos y ejes articuladores',
  generating: 'Diseñando actividades con metodologías apropiadas',
  done: 'Tu planeación está lista para usar',
}

export function LoadingGeneration({ phase }: LoadingGenerationProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="flex items-center gap-3">
        {phase !== 'done' ? (
          <Loader2 size={24} className="text-primary animate-spin" />
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <CheckCircle size={24} className="text-success" />
          </motion.div>
        )}
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold text-text-primary"
        >
          {PHASE_LABELS[phase]}
        </motion.p>
      </div>
      <motion.p
        key={`${phase}-desc`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-text-secondary text-center max-w-md"
      >
        {PHASE_DESCRIPTIONS[phase]}
      </motion.p>
    </div>
  )
}
