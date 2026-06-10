'use client'
import { useCallback, useMemo, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { seededShuffle } from '@/lib/utils/shuffle'

type SortingCategory = {
  name: string
  color: string
}

type SortingItem = {
  word: string
  category: string
  image_url?: string
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
  'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100',
  'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100',
  'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100',
]

export function SortingGame({ content, onComplete }: Props) {
  const { speak } = useSpeech()

  // Shuffle items once on mount
  const shuffledItems = useMemo(() => seededShuffle(content.items, 42), [content.items])

  const [index, setIndex] = useState(0)
  const [tapState, setTapState] = useState<TapState>('idle')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [tally, setTally] = useState<Record<string, number>>({})
  const [complete, setComplete] = useState(false)

  const item = shuffledItems[index]

  const handleSort = useCallback(
    (catName: string) => {
      if (tapState !== 'idle' || !item) return
      speak(item.word, 'en-US')
      setActiveCat(catName)
      if (catName === item.category) {
        setTapState('correct')
        setTimeout(() => {
          setTapState('idle')
          setActiveCat(null)
          setTally((prev) => ({ ...prev, [catName]: (prev[catName] ?? 0) + 1 }))
          if (index + 1 >= shuffledItems.length) {
            setComplete(true)
            onComplete?.()
          } else {
            setIndex((i) => i + 1)
          }
        }, 900)
      } else {
        setTapState('wrong')
        setTimeout(() => {
          setTapState('idle')
          setActiveCat(null)
        }, 600)
      }
    },
    [tapState, item, index, shuffledItems.length, speak, onComplete]
  )

  if (complete) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <p className="text-2xl font-bold text-gray-800">¡Ordenaste todo!</p>
        <div className="flex gap-3 mt-2 flex-wrap justify-center">
          {content.categories.map((cat, i) => (
            <div
              key={cat.name}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-medium ${BIN_BASE[i % BIN_BASE.length]}`}
            >
              {cat.name}: {tally[cat.name] ?? 0}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      {/* Progress */}
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all duration-500"
            style={{ width: `${(index / shuffledItems.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums">
          {index + 1}/{shuffledItems.length}
        </span>
      </div>

      {/* Vocabulary card */}
      <div
        className={[
          'w-40 h-40 rounded-2xl border-2 transition-all duration-300',
          tapState === 'correct' ? 'border-emerald-400 scale-110' : 'border-gray-200',
        ].join(' ')}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.word}
            className="w-full h-full object-contain rounded-2xl p-2"
          />
        ) : (
          <div className="w-full h-full bg-indigo-50 rounded-2xl flex items-center justify-center">
            <p className="text-2xl font-bold text-indigo-800">{item.word}</p>
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-gray-900">{item.word}</p>

      {/* Category bins */}
      <p className="text-sm text-gray-500">¿A dónde va?</p>
      <div
        className={[
          'grid gap-3 w-full',
          content.categories.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
        ].join(' ')}
      >
        {content.categories.map((cat, i) => {
          const isActive = activeCat === cat.name
          const isCorrect = tapState === 'correct' && isActive
          const isWrong = tapState === 'wrong' && isActive
          return (
            <button
              key={cat.name}
              onClick={() => handleSort(cat.name)}
              disabled={tapState !== 'idle'}
              className={[
                'flex flex-col items-center gap-1 py-4 px-2 rounded-2xl border-2 font-semibold text-sm transition-all cursor-pointer min-h-[80px] active:scale-95',
                isCorrect
                  ? 'scale-105 border-emerald-400 bg-emerald-50 text-emerald-800'
                  : isWrong
                    ? 'border-red-400 bg-red-50 text-red-700 opacity-80'
                    : BIN_BASE[i % BIN_BASE.length],
              ].join(' ')}
            >
              <span className="text-xs font-normal opacity-60">{tally[cat.name] ?? 0} ✓</span>
              <span>{cat.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
