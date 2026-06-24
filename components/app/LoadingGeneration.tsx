// components/app/LoadingGeneration.tsx
'use client'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle } from 'lucide-react'

interface LoadingGenerationProps {
  phase: 'preparing' | 'analyzing' | 'generating' | 'subplanes' | 'done'
}

const PHASE_LABELS: Record<LoadingGenerationProps['phase'], string> = {
  preparing: 'Preparando tu planeación...',
  analyzing: 'Revisando vocabulario y NEM...',
  generating: 'Redactando el documento completo...',
  subplanes: 'Generando Letter & Number y Números...',
  done: '¡Planeación lista!',
}

const PHASE_DESCRIPTIONS: Record<LoadingGenerationProps['phase'], string> = {
  preparing: 'Configurando el proyecto mensual y los valores',
  analyzing: 'Alineando campos formativos y ejes articuladores',
  generating: 'Escribiendo con tu estilo, proyecto, ajustes y evaluación',
  subplanes: 'Creando las sub-planeaciones con sus campos y momentos',
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

      {phase !== 'done' && (
        <div className="flex flex-col items-center gap-3 pt-2">
          {/* animated dots so it never looks frozen */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <p className="text-xs text-text-disabled">
            Una planeación completa toma 1–2 minutos. No cierres esta página.
          </p>
        </div>
      )}
    </div>
  )
}
