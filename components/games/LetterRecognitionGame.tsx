'use client'
import { useEffect, useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { useSound } from '@/hooks/useSound'
import { useSpeech } from '@/hooks/useSpeech'
import { celebrate } from '@/lib/ui/celebrate'
import { seededShuffle } from '@/lib/utils/shuffle'
import { VocabVisual } from './VocabVisual'
import { GameProgress } from './GameProgress'
import { GameComplete } from './GameComplete'

type Item = {
  word: string
  target_letter: string
  foil_letters: string[]
  emoji?: string
  image_url?: string
}
type Content = { items: Item[] }
interface Props {
  content: Content
  onComplete?: () => void
}

// Show the word's picture + speak it; tap the letter it starts with (target among foils).
export function LetterRecognitionGame({ content, onComplete }: Props) {
  const sfx = useSound()
  const { speak } = useSpeech()
  const items = content.items ?? []
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [wrong, setWrong] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const item = items[index]
  const choices = useMemo(
    () =>
      item
        ? seededShuffle(
            [item.target_letter, ...(item.foil_letters ?? []).slice(0, 3)],
            index * 13 + 3
          )
        : [],
    [item, index]
  )

  useEffect(() => {
    if (item?.word) speak(item.word, 'en-US')
  }, [item?.word, speak])

  function answer(l: string) {
    if (state !== 'idle' || !item) return
    if (l.toUpperCase() === item.target_letter.toUpperCase()) {
      setState('correct')
      sfx.correct()
      speak(item.word, 'en-US')
      setTimeout(() => {
        setState('idle')
        setWrong(null)
        if (index + 1 >= items.length) {
          setDone(true)
          sfx.win()
          celebrate()
          onComplete?.()
        } else {
          setIndex((i) => i + 1)
        }
      }, 900)
    } else {
      setWrong(l)
      setState('wrong')
      sfx.wrong()
      setTimeout(() => {
        setState('idle')
        setWrong(null)
      }, 600)
    }
  }

  if (done) return <GameComplete title="¡Excelente!" sub={`${items.length} palabras`} />
  if (!item) return null

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      <GameProgress current={index} total={items.length} />
      <p className="text-sm text-gray-500">¿Con qué letra empieza?</p>
      <div className="flex h-[clamp(8rem,26vmin,14rem)] w-[clamp(8rem,26vmin,14rem)] items-center justify-center rounded-2xl bg-indigo-50 ring-2 ring-gray-200">
        <VocabVisual
          word={item.word}
          emoji={item.emoji}
          imageUrl={item.image_url}
          className="h-full w-full rounded-2xl p-2"
        />
      </div>
      <button
        onClick={() => speak(item.word, 'en-US')}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        aria-label="Escuchar"
      >
        <Volume2 className="h-4 w-4" /> Escuchar
      </button>
      <div className="grid w-full max-w-xs grid-cols-2 gap-3">
        {choices.map((l) => {
          const ok = state === 'correct' && l.toUpperCase() === item.target_letter.toUpperCase()
          const bad = state === 'wrong' && l === wrong
          return (
            <button
              key={l}
              onClick={() => answer(l)}
              disabled={state !== 'idle'}
              className={`min-h-[64px] rounded-2xl border-2 font-mono text-2xl font-bold transition active:scale-95 ${
                ok
                  ? 'scale-105 border-emerald-400 bg-emerald-100 text-emerald-800'
                  : bad
                    ? 'border-red-300 bg-red-100 text-red-700'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              {/* Uppercase + lowercase together (Aa) — preschoolers learn both forms. */}
              {l.toUpperCase()}
              {l.toLowerCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
