'use client'
import { useCallback, useMemo, useState } from 'react'
import { useSpeech } from '@/hooks/useSpeech'
import { useSound } from '@/hooks/useSound'
import { celebrate } from '@/lib/ui/celebrate'
import { seededShuffle } from '@/lib/utils/shuffle'
import { VocabVisual } from '@/components/games/VocabVisual'
import { GameProgress } from '@/components/games/GameProgress'
import { GameComplete } from '@/components/games/GameComplete'

type SortingCategory = {
  name: string
  color: string
}

type SortingItem = {
  word: string
  category: string
  image_url?: string
  emoji?: string
}

type SortingContent = {
  categories: SortingCategory[]
  items: SortingItem[]
}

interface Props {
  content: SortingContent
  onComplete?: () => void
}

type TapState = 'idle' | 'correct' | 'wrong'

// Tailwind classes indexed by category position
const BIN_BASE = [
  'bg-blue-50 border-blue-300 text-blue-800',
  'bg-rose-50 border-rose-300 text-rose-800',
  'bg-amber-50 border-amber-300 text-amber-800',
  'bg-emerald-50 border-emerald-300 text-emerald-800',
  'bg-violet-50 border-violet-300 text-violet-800',
]

export function SortingGame({ content, onComplete }: Props) {
  const { speak } = useSpeech()
  const sfx = useSound()

  const shuffledItems = useMemo(() => seededShuffle(content.items, 42), [content.items])

  const [index, setIndex] = useState(0)
  const [tapState, setTapState] = useState<TapState>('idle')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [tally, setTally] = useState<Record<string, number>>({})
  const [complete, setComplete] = useState(false)

  // Drag state (pointer events → works on mouse AND touch; HTML5 DnD does not).
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [overCat, setOverCat] = useState<string | null>(null)

  const item = shuffledItems[index]

  const handleSort = useCallback(
    (catName: string) => {
      if (tapState !== 'idle' || !item) return
      speak(item.word, 'en-US')
      setActiveCat(catName)
      if (catName === item.category) {
        setTapState('correct')
        sfx.correct()
        setTimeout(() => {
          setTapState('idle')
          setActiveCat(null)
          setTally((prev) => ({ ...prev, [catName]: (prev[catName] ?? 0) + 1 }))
          if (index + 1 >= shuffledItems.length) {
            setComplete(true)
            sfx.win()
            celebrate()
            onComplete?.()
          } else {
            setIndex((i) => i + 1)
          }
        }, 900)
      } else {
        setTapState('wrong')
        sfx.wrong()
        setTimeout(() => {
          setTapState('idle')
          setActiveCat(null)
        }, 600)
      }
    },
    [tapState, item, index, shuffledItems.length, speak, onComplete, sfx]
  )

  const catUnderPoint = (x: number, y: number) =>
    (document.elementFromPoint(x, y)?.closest('[data-cat]') as HTMLElement | null)?.dataset.cat ??
    null

  const onPointerDown = (e: React.PointerEvent) => {
    if (tapState !== 'idle') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ x: e.clientX, y: e.clientY })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    setDrag({ x: e.clientX, y: e.clientY })
    setOverCat(catUnderPoint(e.clientX, e.clientY))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return
    setDrag(null)
    setOverCat(null)
    const cat = catUnderPoint(e.clientX, e.clientY)
    if (cat) handleSort(cat)
  }

  if (complete) {
    return (
      <GameComplete title="¡Ordenaste todo!">
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {content.categories.map((cat, i) => (
            <div
              key={cat.name}
              className={`rounded-xl border-2 px-4 py-2 text-lg font-medium ${BIN_BASE[i % BIN_BASE.length]}`}
            >
              {cat.name}: {tally[cat.name] ?? 0}
            </div>
          ))}
        </div>
      </GameComplete>
    )
  }

  if (!item) return null

  return (
    <div className="flex touch-none select-none flex-col items-center gap-5 p-5">
      <GameProgress current={index} total={shuffledItems.length} />
      <p className="text-sm text-gray-500">Arrastra la palabra a su grupo</p>

      {/* Draggable vocabulary tile */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={[
          'flex h-[clamp(7rem,22vmin,11rem)] w-[clamp(7rem,22vmin,11rem)] cursor-grab touch-none flex-col items-center justify-center rounded-2xl border-2 bg-indigo-50 transition-all',
          drag ? 'opacity-40' : 'active:cursor-grabbing',
          tapState === 'correct' ? 'scale-110 border-emerald-400' : 'border-gray-200',
        ].join(' ')}
      >
        <VocabVisual
          word={item.word}
          emoji={item.emoji}
          imageUrl={item.image_url}
          className="h-3/4 w-3/4"
          emojiClassName="text-5xl leading-none"
        />
        <span className="mt-1 text-3xl font-bold text-gray-800">{item.word}</span>
      </div>

      {/* Category drop zones (tap also works as a fallback) */}
      <div
        className={[
          'grid w-full gap-3',
          content.categories.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
        ].join(' ')}
      >
        {content.categories.map((cat, i) => {
          const isActive = activeCat === cat.name
          const isCorrect = tapState === 'correct' && isActive
          const isWrong = tapState === 'wrong' && isActive
          const isOver = overCat === cat.name
          return (
            <button
              key={cat.name}
              data-cat={cat.name}
              onClick={() => handleSort(cat.name)}
              disabled={tapState !== 'idle'}
              className={[
                'flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed py-4 px-2 text-xl font-semibold transition-all',
                isCorrect
                  ? 'scale-105 border-solid border-emerald-400 bg-emerald-50 text-emerald-800'
                  : isWrong
                    ? 'border-solid border-red-400 bg-red-50 text-red-700'
                    : isOver
                      ? 'scale-105 border-solid border-indigo-400 bg-indigo-50 text-indigo-800'
                      : BIN_BASE[i % BIN_BASE.length],
              ].join(' ')}
            >
              <span className="text-xs font-normal opacity-60">{tally[cat.name] ?? 0} ✓</span>
              <span>{cat.name}</span>
            </button>
          )
        })}
      </div>

      {/* Drag ghost follows the pointer; pointer-events-none so hit-testing sees the bin under it */}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border-2 border-indigo-400 bg-white shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          <VocabVisual
            word={item.word}
            emoji={item.emoji}
            imageUrl={item.image_url}
            className="h-14 w-14"
            emojiClassName="text-4xl leading-none"
          />
        </div>
      )}
    </div>
  )
}
