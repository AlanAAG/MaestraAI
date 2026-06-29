'use client'
import { useMemo, useState } from 'react'
import { useSound } from '@/hooks/useSound'
import { useSpeech } from '@/hooks/useSpeech'
import { celebrate } from '@/lib/ui/celebrate'
import { seededShuffle } from '@/lib/utils/shuffle'
import { VocabVisual } from './VocabVisual'
import { GameComplete } from './GameComplete'

type Pair = { word: string; image_url?: string; emoji?: string }
type Content = { pairs: Pair[] }
interface Props {
  content: Content
  onComplete?: () => void
}

// Tap a word, then tap its image. Correct pairs lock; all matched → win.
export function MatchingGame({ content, onComplete }: Props) {
  const sfx = useSound()
  const { speak } = useSpeech()
  const pairs = useMemo(() => (content.pairs ?? []).slice(0, 6), [content.pairs])
  const words = useMemo(
    () =>
      seededShuffle(
        pairs.map((p) => p.word),
        11
      ),
    [pairs]
  )
  const visuals = useMemo(
    () =>
      seededShuffle(
        pairs.map((p) => p.word),
        29
      ),
    [pairs]
  )
  const byWord = useMemo(() => Object.fromEntries(pairs.map((p) => [p.word, p])), [pairs])

  const [selected, setSelected] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string | null>(null)

  function tapImage(word: string) {
    if (!selected || matched.has(word)) return
    if (selected === word) {
      const next = new Set(matched)
      next.add(word)
      setMatched(next)
      sfx.correct()
      speak(word, 'en-US')
      setSelected(null)
      if (next.size === pairs.length) {
        sfx.win()
        celebrate()
        onComplete?.()
      }
    } else {
      sfx.wrong()
      setWrong(word)
      setTimeout(() => setWrong(null), 500)
      setSelected(null)
    }
  }

  if (pairs.length > 0 && matched.size === pairs.length) {
    return <GameComplete title="¡Muy bien!" sub={`${pairs.length} parejas`} />
  }

  return (
    <div className="p-5">
      <p className="mb-4 text-center text-sm text-gray-500">Toca una palabra y luego su imagen</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {words.map((w) => {
            const done = matched.has(w)
            return (
              <button
                key={w}
                disabled={done}
                onClick={() => {
                  speak(w, 'en-US')
                  setSelected(w)
                }}
                className={`w-full rounded-xl border-2 px-3 py-4 text-base font-semibold transition active:scale-95 ${
                  done
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 opacity-60'
                    : selected === w
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300'
                }`}
              >
                {w}
              </button>
            )
          })}
        </div>
        <div className="space-y-2">
          {visuals.map((w) => {
            const p = byWord[w]
            const done = matched.has(w)
            return (
              <button
                key={w}
                disabled={done}
                onClick={() => tapImage(w)}
                className={`flex h-[60px] w-full items-center justify-center rounded-xl border-2 transition active:scale-95 ${
                  done
                    ? 'border-emerald-300 bg-emerald-50 opacity-60'
                    : wrong === w
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
              >
                <VocabVisual
                  word={w}
                  emoji={p?.emoji}
                  imageUrl={p?.image_url}
                  className="h-12 w-12"
                  emojiClassName="text-3xl leading-none"
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
