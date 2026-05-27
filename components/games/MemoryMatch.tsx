'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Trophy, RotateCcw } from 'lucide-react'

type CardPair = {
  id: string
  word: string
  visual_hint: string
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

  // Initialize cards on mount
  useEffect(() => {
    const gameCards: Card[] = []
    pairs.forEach((pair) => {
      gameCards.push({
        id: `${pair.id}-word`,
        pairId: pair.id,
        content: pair.word,
        type: 'word',
      })
      gameCards.push({
        id: `${pair.id}-hint`,
        pairId: pair.id,
        content: pair.visual_hint,
        type: 'hint',
      })
    })
    // Shuffle cards
    setCards(gameCards.sort(() => Math.random() - 0.5))
  }, [pairs])

  // Check for completion
  useEffect(() => {
    if (matched.length === pairs.length && pairs.length > 0) {
      setIsComplete(true)
      if (onComplete) {
        setTimeout(() => onComplete(), 2000)
      }
    }
  }, [matched, pairs.length, onComplete])

  function handleCardClick(cardId: string) {
    // Ignore if already flipped, matched, or checking
    if (flipped.includes(cardId) || matched.includes(cardId) || isChecking) {
      return
    }

    const newFlipped = [...flipped, cardId]
    setFlipped(newFlipped)

    // If two cards are flipped, check for match
    if (newFlipped.length === 2) {
      setIsChecking(true)
      const [first, second] = newFlipped
      const firstCard = cards.find((c) => c.id === first)
      const secondCard = cards.find((c) => c.id === second)

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match found!
        setMatched([...matched, firstCard.pairId])
        setFlipped([])
        setIsChecking(false)
      } else {
        // No match, flip back after delay
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
    setCards(cards.sort(() => Math.random() - 0.5))
  }

  function isCardFlipped(cardId: string): boolean {
    return flipped.includes(cardId) || matched.some((pairId) => cardId.startsWith(pairId))
  }

  function isCardMatched(card: Card): boolean {
    return matched.includes(card.pairId)
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-2">Memory Match</h2>
        <p className="text-text-secondary">Encuentra las parejas de palabras e imágenes</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <span className="text-sm text-text-secondary">
            Parejas encontradas: {matched.length} / {pairs.length}
          </span>
        </div>
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
                      className="text-center"
                    >
                      <p
                        className={`
                        ${card.type === 'word' ? 'text-2xl font-bold text-text-primary' : 'text-base text-text-secondary'}
                      `}
                      >
                        {card.content}
                      </p>
                      {card.type === 'word' && (
                        <span className="text-xs text-primary mt-2 block">palabra</span>
                      )}
                      {card.type === 'hint' && (
                        <span className="text-xs text-accent mt-2 block">pista</span>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 0 }}
                      className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center"
                    >
                      <span className="text-4xl text-primary">?</span>
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
          <p className="text-text-secondary mb-8">Encontraste todas las parejas</p>
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
