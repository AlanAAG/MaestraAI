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

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
}

export function FlashcardProjector({ cards, onExit }: FlashcardProjectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(3)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { speak, stop } = useSpeech()

  // Handle keyboard navigation
  useEffect(() => {
    if (!cards || cards.length === 0) return
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsFlipped(!isFlipped)
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlePrev()
          break
        case 'Escape':
          e.preventDefault()
          handleExit()
          break
        case 'a':
        case 'A':
          e.preventDefault()
          setAutoAdvance(!autoAdvance)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, autoAdvance])

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
    setCurrentIndex(Math.min(currentIndex + 1, cards.length - 1))
  }

  function handlePrev() {
    setIsFlipped(false)
    setCurrentIndex(Math.max(currentIndex - 1, 0))
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
            className={`w-full max-w-6xl aspect-video rounded-3xl ${colors.bg} border-4 ${colors.border} flex flex-col items-center justify-center p-12 cursor-pointer select-none`}
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
                      <p
                        className={`${colors.text} opacity-50 font-mono`}
                        style={{ fontSize: '32px' }}
                      >
                        {card.phonetic}
                      </p>
                    )}

                    {/* Flip hint */}
                    <p style={{ fontSize: '22px' }} className="opacity-40 mt-4">
                      Presiona ESPACIO o haz clic para voltear
                    </p>
                  </div>
                )
              })()
            ) : (
              <div className="text-center space-y-8 w-full">
                {/* Definition title */}
                <div>
                  <h2 className={`${colors.text} font-bold mb-6`} style={{ fontSize: '48px' }}>
                    Definición
                  </h2>
                </div>

                {/* Definition */}
                <div className="max-w-5xl">
                  <p
                    className={`${colors.text} font-semibold`}
                    style={{ fontSize: '44px', lineHeight: '1.5' }}
                  >
                    {card.definition}
                  </p>
                </div>

                {/* Flip hint */}
                <div className="text-text-secondary mt-8">
                  <p style={{ fontSize: '24px' }} className="opacity-60">
                    Presiona ESPACIO o haz clic para volver
                  </p>
                </div>
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
