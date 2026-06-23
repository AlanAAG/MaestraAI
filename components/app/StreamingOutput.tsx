// components/app/StreamingOutput.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Phase = 'idle' | 'preparing' | 'analyzing' | 'generating' | 'done'

const PHASE_LABELS: Record<Exclude<Phase, 'idle'>, string> = {
  preparing: 'Preparando tu solicitud...',
  analyzing: 'Analizando el contexto de tu grupo...',
  generating: 'Generando contenido...',
  done: '¡Listo!',
}

interface StreamingOutputProps {
  isStreaming: boolean
  streamedText: string
  onDownloadPdf?: () => void
  onSave?: () => void
}

export function StreamingOutput({
  isStreaming,
  streamedText,
  onDownloadPdf,
  onSave,
}: StreamingOutputProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!isStreaming) return
    startRef.current = Date.now()
    setPhase('preparing')

    const tick = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      if (elapsed < 1000) setPhase('preparing')
      else if (elapsed < 5000) setPhase('analyzing')
      else setPhase('generating')
    }, 200)

    return () => clearInterval(tick)
  }, [isStreaming])

  useEffect(() => {
    if (!isStreaming && streamedText) {
      setPhase('done')
    }
  }, [isStreaming, streamedText])

  if (phase === 'idle') return null

  return (
    <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-surface p-6 space-y-4">
      {/* Status bar */}
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
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium text-text-secondary"
          >
            {PHASE_LABELS[phase as Exclude<Phase, 'idle'>]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar (generating phase only) */}
      {phase === 'generating' && (
        <div className="h-1 bg-primary-light rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: '10%' }}
            animate={{ width: '85%' }}
            transition={{ duration: 10, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Streamed text preview */}
      {streamedText && (
        <div className="text-base leading-relaxed text-text-primary whitespace-pre-wrap max-h-64 overflow-y-auto">
          {streamedText}
        </div>
      )}

      {/* Done actions */}
      {phase === 'done' && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onDownloadPdf && (
            <Button
              onClick={onDownloadPdf}
              className="min-h-[44px] px-6 text-[15px] font-semibold rounded-xl
                bg-primary text-white hover:bg-primary-dark transition-colors duration-150"
            >
              Descargar PDF
            </Button>
          )}
          {onSave && (
            <Button
              variant="outline"
              onClick={onSave}
              className="min-h-[44px] px-6 text-[15px] font-semibold rounded-xl"
            >
              Guardar en MaestraIA
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
