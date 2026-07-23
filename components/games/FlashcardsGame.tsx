'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { useSound } from '@/hooks/useSound'
import { celebrate } from '@/lib/ui/celebrate'
import { VocabVisual } from './VocabVisual'
import { GameProgress } from './GameProgress'
import { GameComplete } from './GameComplete'

type Card = {
  word: string
  definition?: string
  phonetic?: string
  emoji?: string
  image_url?: string
}
type Content = { cards: Card[] }
interface Props {
  content: Content
  onComplete?: () => void
}

// Student flip-card review: front = picture, tap to reveal word + definition (and hear it).
export function FlashcardsGame({ content, onComplete }: Props) {
  const { speak } = useSpeech()
  const sfx = useSound()
  const cards = content.cards ?? []
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)

  const card = cards[index]

  function flip() {
    const next = !flipped
    setFlipped(next)
    if (next && card) speak(card.word, 'en-US')
  }
  function go(dir: 1 | -1) {
    const ni = index + dir
    if (ni < 0) return
    if (ni >= cards.length) {
      setDone(true)
      sfx.win()
      celebrate()
      onComplete?.()
      return
    }
    setIndex(ni)
    setFlipped(false)
  }

  if (done) {
    return (
      <GameComplete
        title="¡Terminaste!"
        sub={`${cards.length} tarjetas`}
        onReplay={() => {
          setIndex(0)
          setFlipped(false)
          setDone(false)
        }}
      />
    )
  }
  if (!card) return null

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      <GameProgress current={index} total={cards.length} />

      <div className="[perspective:1200px]">
        <motion.button
          onClick={flip}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-[clamp(13rem,42vmin,20rem)] w-[clamp(11rem,34vmin,16rem)] [transform-style:preserve-3d]"
          aria-label={flipped ? card.word : 'Tarjeta — toca para girar'}
        >
          {/* Front: picture */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-indigo-200 bg-white shadow-lg [backface-visibility:hidden]">
            <VocabVisual
              word={card.word}
              emoji={card.emoji}
              imageUrl={card.image_url}
              className="h-32 w-32"
              emojiClassName="text-7xl leading-none"
            />
            <span className="text-sm text-gray-400">Toca para ver</span>
          </div>
          {/* Back: the word, big — no translation (English immersion; the picture is the meaning) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-indigo-400 bg-indigo-50 p-5 text-center shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="break-words text-5xl font-bold text-gray-900">{card.word}</p>
          </div>
        </motion.button>
      </div>

      <button
        onClick={() => speak(card.word, 'en-US')}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        aria-label="Escuchar"
      >
        <Volume2 className="h-4 w-4" /> Escuchar
      </button>

      <div className="flex items-center gap-4">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-full border border-gray-200 p-3 text-gray-600 transition hover:bg-gray-50 disabled:opacity-30"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm tabular-nums text-gray-400">
          {index + 1} / {cards.length}
        </span>
        <button
          onClick={() => go(1)}
          className="rounded-full bg-primary p-3 text-white shadow-sm transition hover:opacity-90"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
