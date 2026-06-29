'use client'
import { useEffect, useState } from 'react'
import { Clock, Volume2, VolumeX } from 'lucide-react'
import { useGameAudio } from '@/hooks/useGameAudio'
import { WordSearchGame } from './WordSearchGame'
import { StudentBingoCard } from './StudentBingoCard'
import { MemoryMatch } from './MemoryMatch'
import { PictureWordMatch } from './PictureWordMatch'
import { SortingGame } from './SortingGame'
import { MatchingGame } from './MatchingGame'
import { LetterRecognitionGame } from './LetterRecognitionGame'
import { FlashcardsGame } from './FlashcardsGame'
import { GameComplete } from './GameComplete'

// Game types with an interactive web player (drives the detail page + /jugar gating).
export const PLAYABLE_TYPES = [
  'word_search',
  'bingo',
  'memory_game',
  'picture_word_match',
  'sorting_game',
  'matching',
  'letter_recognition',
  'flashcards',
]

const GAME_TITLES: Record<string, string> = {
  word_search: 'Sopa de Letras',
  bingo: 'Bingo',
  memory_game: 'Memorama',
  flashcards: 'Flashcards',
  picture_word_match: '¿Cuál es la palabra?',
  sorting_game: 'Ordena y clasifica',
  matching: 'Relaciona',
  letter_recognition: 'Reconoce la letra',
}

interface Props {
  type: string
  content: Record<string, unknown>
  vocabulary: string[]
}

export function GameShell({ type, content, vocabulary }: Props) {
  const [done, setDone] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const { playing, toggle } = useGameAudio()

  const title = GAME_TITLES[type] ?? 'Juego'

  // Gentle elapsed timer (count-up, not a countdown) — freezes on win, resets on replay.
  useEffect(() => {
    if (done) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [done])
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h1 className="font-semibold text-gray-800">{title}</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs tabular-nums text-gray-400">
            <Clock size={13} /> {clock}
          </span>
          {vocabulary.length > 0 && (
            <span className="hidden text-xs text-gray-400 sm:inline">
              {vocabulary.length} palabras
            </span>
          )}
          <button
            type="button"
            onClick={toggle}
            title={playing ? 'Silenciar música' : 'Música de fondo'}
            aria-label={playing ? 'Silenciar música' : 'Música de fondo'}
            className={`rounded-full p-1.5 transition-colors ${playing ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {done ? (
        <GameComplete
          title="¡Muy bien!"
          sub={`Terminaste en ${clock}`}
          onReplay={() => {
            setSeconds(0)
            setDone(false)
          }}
        />
      ) : type === 'word_search' ? (
        <WordSearchGame
          content={content as Parameters<typeof WordSearchGame>[0]['content']}
          onComplete={() => setDone(true)}
        />
      ) : type === 'bingo' ? (
        <StudentBingoCard content={content as Parameters<typeof StudentBingoCard>[0]['content']} />
      ) : type === 'memory_game' ? (
        <MemoryMatch
          pairs={(content.pairs as Parameters<typeof MemoryMatch>[0]['pairs']) ?? []}
          onComplete={() => setDone(true)}
        />
      ) : type === 'picture_word_match' ? (
        <PictureWordMatch
          content={content as Parameters<typeof PictureWordMatch>[0]['content']}
          onComplete={() => setDone(true)}
        />
      ) : type === 'sorting_game' ? (
        <SortingGame
          content={content as Parameters<typeof SortingGame>[0]['content']}
          onComplete={() => setDone(true)}
        />
      ) : type === 'matching' ? (
        <MatchingGame
          content={content as Parameters<typeof MatchingGame>[0]['content']}
          onComplete={() => setDone(true)}
        />
      ) : type === 'letter_recognition' ? (
        <LetterRecognitionGame
          content={content as Parameters<typeof LetterRecognitionGame>[0]['content']}
          onComplete={() => setDone(true)}
        />
      ) : type === 'flashcards' ? (
        <FlashcardsGame
          content={content as Parameters<typeof FlashcardsGame>[0]['content']}
          onComplete={() => setDone(true)}
        />
      ) : (
        <div className="p-8 text-center text-gray-400">
          <p className="text-sm">Este tipo de juego no está disponible en modo alumno todavía.</p>
        </div>
      )}
    </div>
  )
}
