'use client'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { Volume2 } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { useSound } from '@/hooks/useSound'
import { celebrate } from '@/lib/ui/celebrate'
import { seededShuffle } from '@/lib/utils/shuffle'
import { VocabVisual } from '@/components/games/VocabVisual'
import { GameProgress } from '@/components/games/GameProgress'
import { GameComplete } from '@/components/games/GameComplete'

type PictureWordMatchItem = {
  word: string
  image_url?: string
  emoji?: string
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
  const sfx = useSound()
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
        sfx.correct()
        speak(item.word, 'en-US')
        setTimeout(() => {
          setAnswerState('idle')
          setWrongWord(null)
          if (index + 1 >= content.items.length) {
            setComplete(true)
            sfx.win()
            celebrate()
            onComplete?.()
          } else {
            setIndex((i) => i + 1)
          }
        }, 900)
      } else {
        setWrongWord(word)
        setAnswerState('wrong')
        sfx.wrong()
        setTimeout(() => {
          setAnswerState('idle')
          setWrongWord(null)
        }, 600)
      }
    },
    [answerState, item, index, content.items.length, speak, onComplete, sfx]
  )

  if (complete) {
    return <GameComplete title="¡Excelente!" sub={`${content.items.length} palabras completadas`} />
  }

  if (!item) return null

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      <GameProgress current={index} total={content.items.length} />

      {/* Visual card — emoji-first, image/text fallback */}
      <div
        className={[
          'w-[clamp(9rem,30vmin,16rem)] h-[clamp(9rem,30vmin,16rem)] rounded-2xl flex items-center justify-center bg-indigo-50 transition-all duration-300',
          answerState === 'correct' ? 'ring-4 ring-emerald-400 scale-105' : 'ring-2 ring-gray-200',
        ].join(' ')}
      >
        <VocabVisual
          word={item.word}
          emoji={item.emoji}
          imageUrl={item.image_url}
          className="w-full h-full rounded-2xl p-2"
        />
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
