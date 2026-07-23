'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { ProjectorControls } from './ProjectorControls'
import { useSpeech } from '@/hooks/useSpeech'
import { VocabVisual } from './VocabVisual'
import { wordToEmoji } from '@/lib/materials/emoji'

export type Flashcard = {
  word: string
  definition: string
  color: string
  phonetic?: string
  image_url?: string
  emoji?: string
  // kept for backward compat with older stored content
  example?: string
}

interface FlashcardProjectorProps {
  cards: Flashcard[]
  onExit: () => void
}

// Soft gradient card themes (was flat bg-*-100 — looked too basic).
const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  red: {
    bg: 'bg-gradient-to-br from-rose-50 to-red-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  blue: {
    bg: 'bg-gradient-to-br from-sky-50 to-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-50 to-green-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  yellow: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  purple: {
    bg: 'bg-gradient-to-br from-violet-50 to-purple-100',
    text: 'text-violet-700',
    border: 'border-violet-200',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50 to-rose-100',
    text: 'text-pink-700',
    border: 'border-pink-200',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
}

export function FlashcardProjector({ cards, onExit }: FlashcardProjectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(3)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { speak, stop } = useSpeech()

  // Keyboard navigation — functional state updates + a stable listener so the captured index is
  // never stale (the old closure-based version could skip/stick when advancing without flipping).
  useEffect(() => {
    if (!cards || cards.length === 0) return
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsFlipped((f) => !f)
          break
        case 'ArrowRight':
          e.preventDefault()
          setIsFlipped(false)
          setCurrentIndex((i) => Math.min(i + 1, cards.length - 1))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setIsFlipped(false)
          setCurrentIndex((i) => Math.max(i - 1, 0))
          break
        case 'Escape':
          e.preventDefault()
          handleExit()
          break
        case 'a':
        case 'A':
          e.preventDefault()
          setAutoAdvance((a) => !a)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length])

  // Speak word aloud whenever card advances (teacher projection aid)
  useEffect(() => {
    if (!cards || cards.length === 0) return
    const card = cards[currentIndex]
    if (card) speak(card.word, 'en-US')
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  // Auto-advance logic
  useEffect(() => {
    if (!autoAdvance || isFlipped || !cards || cards.length === 0) return

    const timer = setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setAutoAdvance(false)
      }
    }, autoAdvanceDelay * 1000)

    return () => clearTimeout(timer)
  }, [autoAdvance, currentIndex, cards, autoAdvanceDelay, isFlipped])

  // Fullscreen API
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (!cards || cards.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <p className="text-white text-2xl">No hay tarjetas disponibles.</p>
      </div>
    )
  }

  const card = cards[currentIndex]
  const colors = colorMap[card.color] || colorMap.blue

  function handleNext() {
    setIsFlipped(false)
    setCurrentIndex((i) => Math.min(i + 1, cards.length - 1))
  }

  function handlePrev() {
    setIsFlipped(false)
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }

  async function handleFullscreen() {
    const element = document.documentElement
    if (!document.fullscreenElement) {
      await element.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  function handleExit() {
    setAutoAdvance(false)
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
    onExit()
  }

  return (
    <div
      className="fixed inset-0 bg-white flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* Main flashcard */}
      <div className="w-full h-full flex items-center justify-center p-12 pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${isFlipped}`}
            initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
            transition={{ duration: 0.4 }}
            className={`w-full max-w-6xl aspect-video rounded-[2rem] ${colors.bg} border ${colors.border} shadow-2xl ring-1 ring-black/5 flex flex-col items-center justify-center p-12 cursor-pointer select-none`}
            onClick={() => setIsFlipped(!isFlipped)}
            style={{
              perspective: '1000px',
              backfaceVisibility: 'hidden',
            }}
          >
            {!isFlipped ? (
              (() => {
                const hasVisual = !!(card.emoji || wordToEmoji(card.word) || card.image_url)
                return (
                  <div className="flex flex-col items-center justify-center h-full w-full gap-4">
                    {/* Visual — emoji-first, image fallback */}
                    {hasVisual && (
                      <VocabVisual
                        word={card.word}
                        emoji={card.emoji}
                        imageUrl={card.image_url}
                        className="flex-shrink-0 max-h-[40%]"
                        emojiClassName="text-[clamp(5rem,22vmin,12rem)] leading-none"
                      />
                    )}

                    {/* Main word + speaker */}
                    <div className="flex items-center gap-4">
                      <h1
                        className={`${colors.text} font-bold`}
                        style={{ fontSize: hasVisual ? '72px' : '96px', lineHeight: '1.1' }}
                      >
                        {card.word}
                      </h1>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          speak(card.word, 'en-US')
                        }}
                        className={`${colors.text} opacity-60 hover:opacity-100 transition-opacity cursor-pointer`}
                        aria-label="Pronunciar"
                      >
                        <Volume2 size={card.image_url ? 40 : 52} />
                      </button>
                    </div>

                    {card.phonetic && (
                      <p className={`${colors.text} opacity-50`} style={{ fontSize: '32px' }}>
                        {card.phonetic}
                      </p>
                    )}

                    {/* Flip hint */}
                    <span
                      style={{ fontSize: '18px' }}
                      className={`mt-4 rounded-full bg-white/60 px-4 py-1.5 font-medium ${colors.text} opacity-70`}
                    >
                      Presiona ESPACIO o haz clic para voltear
                    </span>
                  </div>
                )
              })()
            ) : (
              // Back: picture + word, huge — no Spanish translation (the picture IS the meaning).
              <div className="flex h-full w-full flex-col items-center justify-center gap-6 text-center">
                <VocabVisual
                  word={card.word}
                  emoji={card.emoji}
                  imageUrl={card.image_url}
                  className="max-h-[55%]"
                  emojiClassName="text-[clamp(6rem,30vmin,16rem)] leading-none"
                />
                <p className={`${colors.text} font-bold`} style={{ fontSize: '80px' }}>
                  {card.word}
                </p>
                <p style={{ fontSize: '24px' }} className="opacity-60">
                  Presiona ESPACIO o haz clic para volver
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls overlay */}
      <ProjectorControls
        currentIndex={currentIndex}
        totalCards={cards.length}
        isFlipped={isFlipped}
        autoAdvance={autoAdvance}
        autoAdvanceDelay={autoAdvanceDelay}
        isFullscreen={isFullscreen}
        onNext={handleNext}
        onPrev={handlePrev}
        onFlip={() => setIsFlipped(!isFlipped)}
        onAutoAdvanceToggle={() => {
          setAutoAdvance(!autoAdvance)
          setIsFlipped(false)
        }}
        onAutoAdvanceDelayChange={setAutoAdvanceDelay}
        onFullscreenToggle={handleFullscreen}
        onExit={handleExit}
      />
    </div>
  )
}
