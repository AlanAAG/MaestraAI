'use client'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface ProjectorControlsProps {
  currentIndex: number
  totalCards: number
  isFlipped: boolean
  autoAdvance: boolean
  autoAdvanceDelay: number
  isFullscreen: boolean
  onNext: () => void
  onPrev: () => void
  onFlip: () => void
  onAutoAdvanceToggle: () => void
  onAutoAdvanceDelayChange: (delay: number) => void
  onFullscreenToggle: () => void
  onExit: () => void
}

export function ProjectorControls({
  currentIndex,
  totalCards,
  isFlipped,
  autoAdvance,
  autoAdvanceDelay,
  isFullscreen,
  onNext,
  onPrev,
  onFlip,
  onAutoAdvanceToggle,
  onAutoAdvanceDelayChange,
  onFullscreenToggle,
  onExit,
}: ProjectorControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-50"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Navigation */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onPrev}
              disabled={currentIndex === 0}
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] p-0"
              title="Anterior (Flecha izquierda)"
            >
              <ChevronLeft size={24} />
            </Button>

            <Button
              onClick={onFlip}
              variant="outline"
              size="sm"
              className={`min-h-[44px] px-3 gap-2 ${isFlipped ? 'bg-primary-light' : ''}`}
              title="Voltear (ESPACIO)"
            >
              <RotateCw size={18} />
              <span className="hidden sm:inline text-sm font-medium">
                {isFlipped ? 'Frente' : 'Atrás'}
              </span>
            </Button>

            <Button
              onClick={onNext}
              disabled={currentIndex === totalCards - 1}
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] p-0"
              title="Siguiente (Flecha derecha)"
            >
              <ChevronRight size={24} />
            </Button>
          </div>

          {/* Center: Progress & Auto-advance */}
          <div className="flex items-center gap-6">
            {/* Progress */}
            <div className="text-center">
              <p className="text-sm font-semibold text-text-primary">
                {currentIndex + 1} de {totalCards}
              </p>
              <div className="w-24 h-2 bg-border rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
                />
              </div>
            </div>

            {/* Auto-advance controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onAutoAdvanceToggle}
                variant={autoAdvance ? 'default' : 'outline'}
                size="sm"
                className="min-h-[44px] min-w-[44px] p-0"
                title="Auto-avanzar (A)"
              >
                {autoAdvance ? <Pause size={20} /> : <Play size={20} />}
              </Button>

              {autoAdvance && (
                <select
                  value={autoAdvanceDelay}
                  onChange={(e) => onAutoAdvanceDelayChange(parseInt(e.target.value))}
                  className="min-h-[44px] px-3 rounded-md border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value={2}>2s</option>
                  <option value={3}>3s</option>
                  <option value={4}>4s</option>
                  <option value={5}>5s</option>
                </select>
              )}
            </div>
          </div>

          {/* Right: Fullscreen & Exit */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onFullscreenToggle}
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] p-0 hidden md:flex"
              title="Pantalla completa"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </Button>

            <Button
              onClick={onExit}
              variant="outline"
              size="sm"
              className="min-h-[44px] px-3 gap-2 text-destructive hover:text-destructive"
              title="Salir (ESC)"
            >
              <X size={18} />
              <span className="hidden sm:inline text-sm font-medium">Salir</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
