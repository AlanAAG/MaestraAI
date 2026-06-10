'use client'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { CheckCircle, Volume2 } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { seededShuffle } from '@/lib/utils/shuffle'

type PictureWordMatchItem = {
  word: string
  image_url?: string
  foils: string[]
}

type PictureWordMatchContent = {
  items: PictureWordMatchItem[]
}

interface Props {
  content: PictureWordMatchContent
  onComplete?: () => void
}

type AnswerState = 'idle' | 'correct' | 'wrong'

export function PictureWordMatch({ content, onComplete }: Props) {
  const { speak } = useSpeech()
  const [index, setIndex] = useState(0)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [wrongWord, setWrongWord] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)

  const item = content.items[index]

  const choices = useMemo(() => {
    if (!item) return []
    const all = [item.word, ...item.foils.slice(0, 3)]
    return seededShuffle(all, index * 17 + 7)
  }, [item, index])

  // Speak word whenever we advance to a new item
  useEffect(() => {
    if (item?.word) speak(item.word, 'en-US')
  }, [item?.word, speak])

  const handleAnswer = useCallback(
    (word: string) => {
      if (answerState !== 'idle' || !item) return
      if (word === item.word) {
        setAnswerState('correct')
        speak(item.word, 'en-US')
        setTimeout(() => {
          setAnswerState('idle')
          setWrongWord(null)
          if (index + 1 >= content.items.length) {
            setComplete(true)
            onComplete?.()
          } else {
            setIndex((i) => i + 1)
          }
        }, 900)
      } else {
        setWrongWord(word)
        setAnswerState('wrong')
        setTimeout(() => {
          setAnswerState('idle')
          setWrongWord(null)
        }, 600)
      }
    },
    [answerState, item, index, content.items.length, speak, onComplete]
  )

  if (complete) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <p className="text-2xl font-bold text-gray-800">¡Excelente!</p>
        <p className="text-gray-500 text-sm">{content.items.length} palabras completadas</p>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      {/* Progress bar */}
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all duration-500"
            style={{ width: `${(index / content.items.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums">
          {index + 1}/{content.items.length}
        </span>
      </div>

      {/* Image card */}
      <div
        className={[
          'w-44 h-44 rounded-2xl flex items-center justify-center transition-all duration-300',
          answerState === 'correct' ? 'ring-4 ring-emerald-400 scale-105' : 'ring-2 ring-gray-200',
        ].join(' ')}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt="imagen"
            className="w-full h-full object-contain rounded-2xl"
          />
        ) : (
          <div className="w-full h-full bg-indigo-50 rounded-2xl flex items-center justify-center">
            <span className="text-5xl">🖼️</span>
          </div>
        )}
      </div>

      {/* Replay pronunciation */}
      <button
        onClick={() => speak(item.word, 'en-US')}
        className="flex items-center gap-2 text-indigo-600 text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-50 active:bg-indigo-100 transition-colors cursor-pointer"
        aria-label="Escuchar pronunciación"
      >
        <Volume2 className="h-4 w-4" /> Escuchar
      </button>

      {/* Word choices (2×2 grid) */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {choices.map((word) => {
          const isCorrect = answerState === 'correct' && word === item.word
          const isWrong = answerState === 'wrong' && word === wrongWord
          return (
            <button
              key={word}
              onClick={() => handleAnswer(word)}
              disabled={answerState !== 'idle'}
              className={[
                'py-4 px-3 rounded-2xl text-base font-semibold border-2 transition-all min-h-[60px] cursor-pointer active:scale-95',
                isCorrect
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-105'
                  : isWrong
                    ? 'bg-red-100 border-red-300 text-red-700 opacity-80'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-indigo-300 hover:bg-indigo-50',
              ].join(' ')}
            >
              {word}
            </button>
          )
        })}
      </div>
    </div>
  )
}
