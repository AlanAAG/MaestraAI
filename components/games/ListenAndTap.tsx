'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, Volume2 } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { seededShuffle } from '@/lib/utils/shuffle'

export type ListenPair = { word: string; image_url: string }

interface Props {
  pairs: ListenPair[]
  onComplete?: () => void
}

type SelectState = 'idle' | 'correct' | 'wrong'

export function ListenAndTap({ pairs, onComplete }: Props) {
  const { speak } = useSpeech()
  const [round, setRound] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selectState, setSelectState] = useState<SelectState>('idle')
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const [complete, setComplete] = useState(false)

  const total = pairs.length

  // For each round: pick target + up to 3 distractors, shuffle all
  const { target, options } = useMemo(() => {
    if (total === 0) return { target: null, options: [] as typeof pairs }
    const targetPair = pairs[round % total]
    const others = pairs.filter((_, i) => i !== round % total)
    const distractors = seededShuffle(others, round * 31 + 5).slice(0, 3)
    return {
      target: targetPair,
      options: seededShuffle([targetPair, ...distractors], round * 13 + 3),
    }
  }, [round, pairs, total])

  const speakWord = useCallback(() => {
    if (target?.word) speak(target.word, 'en-US')
  }, [target?.word, speak])

  // Speak after a short delay so students see the grid first
  useEffect(() => {
    setRevealed(false)
    const t = setTimeout(speakWord, 500)
    return () => clearTimeout(t)
  }, [round, speakWord])

  const handleTap = useCallback(
    (idx: number) => {
      if (selectState !== 'idle' || !target) return
      const tapped = options[idx]
      if (tapped.word === target.word) {
        setSelectState('correct')
        setRevealed(true)
        speak(target.word, 'en-US')
        setTimeout(() => {
          setSelectState('idle')
          setWrongIdx(null)
          if (round + 1 >= total) {
            setComplete(true)
            onComplete?.()
          } else {
            setRound((r) => r + 1)
          }
        }, 1000)
      } else {
        setWrongIdx(idx)
        setSelectState('wrong')
        setTimeout(() => {
          setSelectState('idle')
          setWrongIdx(null)
        }, 700)
      }
    },
    [selectState, options, target, round, total, speak, onComplete]
  )

  if (total === 0 || !target) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-sm">No hay imágenes para practicar.</p>
      </div>
    )
  }

  if (complete) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <p className="text-2xl font-bold text-gray-800">¡Muy bien!</p>
        <p className="text-gray-500 text-sm">¡Escuchaste todas las palabras!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 p-4">
      {/* Progress */}
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all"
            style={{ width: `${(round / total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">
          {round + 1}/{total}
        </span>
      </div>

      {/* Instruction + speak button */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-gray-500 text-center">Toca la imagen que escuchas</p>
        <button
          onClick={speakWord}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl transition-colors cursor-pointer min-h-[48px]"
        >
          <Volume2 className="h-5 w-5" />
          {revealed ? target.word : '?'}
        </button>
      </div>

      {/* 2×2 image grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {options.map((pair, idx) => {
          const isTarget = pair.word === target.word
          const isCorrect = selectState === 'correct' && isTarget
          const isWrong = selectState === 'wrong' && idx === wrongIdx
          return (
            <button
              key={`${round}-${idx}`}
              onClick={() => handleTap(idx)}
              disabled={selectState !== 'idle'}
              className={[
                'aspect-square rounded-2xl overflow-hidden border-4 transition-all cursor-pointer active:scale-95',
                isCorrect
                  ? 'border-emerald-400 ring-4 ring-emerald-200 scale-105'
                  : isWrong
                    ? 'border-red-400 ring-2 ring-red-200 opacity-70'
                    : 'border-transparent hover:border-indigo-200',
              ].join(' ')}
              aria-label={`imagen ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pair.image_url} alt="imagen" className="w-full h-full object-cover" />
            </button>
          )
        })}
      </div>

      {revealed && <p className="text-lg font-bold text-emerald-700">{target.word}</p>}
    </div>
  )
}
