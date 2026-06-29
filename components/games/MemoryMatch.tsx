'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Trophy, RotateCcw } from 'lucide-react'
import { seededShuffle } from '@/lib/utils/shuffle'
import { VocabVisual } from '@/components/games/VocabVisual'
import { useSound } from '@/hooks/useSound'
import { useSpeech } from '@/hooks/useSpeech'
import { celebrate } from '@/lib/ui/celebrate'

type CardPair = {
  id: string
  word: string
  visual_hint: string
  image_url?: string
  emoji?: string
}

type Card = {
  id: string
  pairId: string
  content: string
  type: 'word' | 'hint'
}

interface MemoryMatchProps {
  pairs: CardPair[]
  onComplete?: () => void
}

export function MemoryMatch({ pairs, onComplete }: MemoryMatchProps) {
  const [cards, setCards] = useState<Card[]>([])
  const [flipped, setFlipped] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [moves, setMoves] = useState(0)
  const sfx = useSound()
  const { speak } = useSpeech()

  // Initialize cards on mount with a deterministic seed derived from pair IDs
  useEffect(() => {
    const gameCards: Card[] = []
    pairs.forEach((pair) => {
      const pid = String(pair.id)
      gameCards.push({
        id: `${pid}-word`,
        pairId: pid,
        content: pair.word,
        type: 'word',
      })
      gameCards.push({
        id: `${pid}-hint`,
        pairId: pid,
        content: pair.visual_hint,
        type: 'hint',
      })
    })
    const seed = pairs.reduce((acc, p) => acc + String(p.id).charCodeAt(0), 0) * 17
    setCards(seededShuffle(gameCards, seed))
  }, [pairs])

  // Check for completion
  useEffect(() => {
    if (matched.length === pairs.length && pairs.length > 0) {
      setIsComplete(true)
      sfx.win()
      celebrate()
      if (onComplete) {
        setTimeout(() => onComplete(), 2000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, pairs.length, onComplete])

  function handleCardClick(cardId: string) {
    // Ignore if already flipped, matched, or checking
    if (
      flipped.includes(cardId) ||
      matched.some((pid) => cardId.startsWith(pid + '-')) ||
      isChecking
    ) {
      return
    }

    const newFlipped = [...flipped, cardId]
    setFlipped(newFlipped)

    // If two cards are flipped, check for match
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1)
      setIsChecking(true)
      const [first, second] = newFlipped
      const firstCard = cards.find((c) => c.id === first)
      const secondCard = cards.find((c) => c.id === second)

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match found!
        setMatched([...matched, firstCard.pairId])
        setFlipped([])
        setIsChecking(false)
        sfx.correct()
        const word = pairs.find((p) => String(p.id) === firstCard.pairId)?.word
        if (word) speak(word, 'en-US')
      } else {
        // No match, flip back after delay
        sfx.wrong()
        setTimeout(() => {
          setFlipped([])
          setIsChecking(false)
        }, 1000)
      }
    }
  }

  function handleReset() {
    setFlipped([])
    setMatched([])
    setIsChecking(false)
    setIsComplete(false)
    setMoves(0)
    // Fresh random seed on reset so the game feels different each play
    setCards((prev) => seededShuffle(prev, Math.floor(Math.random() * 1_000_000)))
  }

  function isCardFlipped(cardId: string): boolean {
    return flipped.includes(cardId) || matched.some((pairId) => cardId.startsWith(pairId))
  }

  function isCardMatched(card: Card): boolean {
    return matched.includes(card.pairId)
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-5">
      {/* Stats (title lives in the GameShell header) */}
      <div className="mb-5 flex items-center justify-center gap-6">
        <span className="text-sm text-text-secondary">
          Parejas: {matched.length} / {pairs.length}
        </span>
        <span className="text-sm text-text-secondary tabular-nums">Intentos: {moves}</span>
      </div>

      {/* Game Grid */}
      <div
        className="grid gap-4 w-full max-w-5xl"
        style={{
          gridTemplateColumns: `repeat(${Math.min(4, Math.ceil(Math.sqrt(cards.length)))}, minmax(0, 1fr))`,
        }}
      >
        <AnimatePresence>
          {cards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => handleCardClick(card.id)}
                disabled={isCardFlipped(card.id) || isChecking}
                className={`
                  relative w-full aspect-square rounded-xl
                  transition-all duration-300 transform
                  ${isCardMatched(card) ? 'bg-success/20 border-2 border-success' : 'bg-surface border-2 border-border'}
                  ${!isCardFlipped(card.id) && !isChecking ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : ''}
                  ${isCardFlipped(card.id) ? 'scale-105' : ''}
                  focus:outline-none focus:ring-2 focus:ring-primary
                `}
                aria-label={isCardFlipped(card.id) ? card.content : 'Card hidden'}
              >
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  {isCardFlipped(card.id) ? (
                    <motion.div
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-center w-full px-1"
                    >
                      {card.type === 'word' ? (
                        <>
                          <p className="text-2xl font-bold text-text-primary">{card.content}</p>
                          <span className="text-xs text-primary mt-2 block">palabra</span>
                        </>
                      ) : (
                        (() => {
                          const pair = pairs.find((p) => String(p.id) === card.pairId)
                          return (
                            <VocabVisual
                              word={pair?.word ?? card.content}
                              emoji={pair?.emoji}
                              imageUrl={pair?.image_url}
                              className="w-full h-full p-1"
                              emojiClassName="text-[clamp(1.75rem,9vmin,4rem)] leading-none"
                            />
                          )
                        })()
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 0 }}
                      className="flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5"
                    >
                      <span className="text-5xl text-primary/70">?</span>
                    </motion.div>
                  )}
                </div>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Completion message */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-bg/95 backdrop-blur-sm"
        >
          <Trophy size={64} className="text-success mb-4" />
          <h3 className="text-4xl font-bold text-text-primary mb-2">¡Felicidades!</h3>
          <p className="text-text-secondary mb-2">Encontraste todas las parejas</p>
          <p className="text-text-secondary mb-8 tabular-nums">en {moves} intentos</p>
          <Button onClick={handleReset} className="min-h-[44px] bg-primary hover:bg-primary-dark">
            <RotateCcw size={18} className="mr-2" />
            Jugar de nuevo
          </Button>
        </motion.div>
      )}

      {/* Reset button */}
      {!isComplete && (
        <Button onClick={handleReset} variant="outline" className="mt-8 min-h-[44px]">
          <RotateCcw size={18} className="mr-2" />
          Reiniciar
        </Button>
      )}
    </div>
  )
}
