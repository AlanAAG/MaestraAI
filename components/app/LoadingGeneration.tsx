// components/app/LoadingGeneration.tsx
'use client'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle } from 'lucide-react'

interface LoadingGenerationProps {
  phase: 'preparing' | 'analyzing' | 'generating' | 'done'
}

const PHASE_LABELS = {
  preparing: 'Preparando solicitud...',
  analyzing: 'Analizando contexto...',
  generating: 'Generando contenido...',
  done: '¡Listo!',
}

export function LoadingGeneration({ phase }: LoadingGenerationProps) {
  return (
    <div className="flex items-center gap-3">
      {phase !== 'done' ? (
        <Loader2 size={20} className="text-primary animate-spin" />
      ) : (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <CheckCircle size={20} className="text-success" />
        </motion.div>
      )}
      <motion.p
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-medium text-text-secondary"
      >
        {PHASE_LABELS[phase]}
      </motion.p>
    </div>
  )
}
