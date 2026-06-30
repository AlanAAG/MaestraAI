'use client'
import { useEffect, useState } from 'react'
import { Clock, Volume2, VolumeX, Play, Pause, RotateCcw } from 'lucide-react'
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
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [runId, setRunId] = useState(0) // bump to remount (restart) the game fresh
  const { muted, play, pause, toggleMute } = useGameAudio()

  const title = GAME_TITLES[type] ?? 'Juego'

  // Gentle elapsed timer — runs only while playing (started, not paused, not finished).
  useEffect(() => {
    if (!started || paused || done) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [started, paused, done])
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  // The Start click is the user gesture browsers require to begin audio → music autoplays here.
  function start() {
    setStarted(true)
    setPaused(false)
    setDone(false)
    setSeconds(0)
    play()
  }
  function togglePause() {
    setPaused((p) => {
      const next = !p
      if (next) pause()
      else if (!muted) play()
      return next
    })
  }
  function restart() {
    setSeconds(0)
    setDone(false)
    setPaused(false)
    setRunId((r) => r + 1)
    if (!muted) play()
  }
  function replay() {
    setSeconds(0)
    setDone(false)
    setRunId((r) => r + 1)
    if (!muted) play()
  }

  const game =
    type === 'word_search' ? (
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
    )

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h1 className="font-semibold text-gray-800">{title}</h1>
        <div className="flex items-center gap-2">
          {started && (
            <>
              <span className="flex items-center gap-1 text-xs tabular-nums text-gray-400">
                <Clock size={13} /> {clock}
              </span>
              {vocabulary.length > 0 && (
                <span className="hidden text-xs text-gray-400 sm:inline">
                  {vocabulary.length} palabras
                </span>
              )}
              {!done && (
                <>
                  <button
                    type="button"
                    onClick={togglePause}
                    title={paused ? 'Reanudar' : 'Pausa'}
                    aria-label={paused ? 'Reanudar' : 'Pausa'}
                    className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    {paused ? <Play size={16} /> : <Pause size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={restart}
                    title="Reiniciar"
                    aria-label="Reiniciar"
                    className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <RotateCcw size={16} />
                  </button>
                </>
              )}
              {/* Mute button — bigger, and defaults to playing (mute to stop hearing). */}
              <button
                type="button"
                onClick={toggleMute}
                title={muted ? 'Activar música' : 'Silenciar música'}
                aria-label={muted ? 'Activar música' : 'Silenciar música'}
                className={`rounded-full p-2.5 transition-colors ${muted ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
              >
                {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
            </>
          )}
        </div>
      </div>

      {!started ? (
        <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
          <p className="text-lg font-medium text-gray-700">¿List@s para jugar?</p>
          <button
            type="button"
            onClick={start}
            className="flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            <Play size={24} className="fill-current" /> Comenzar
          </button>
          <p className="text-xs text-gray-400">La música de fondo se activa al comenzar 🎵</p>
        </div>
      ) : done ? (
        <GameComplete title="¡Muy bien!" sub={`Terminaste en ${clock}`} onReplay={replay} />
      ) : (
        <div className="relative" key={runId}>
          {game}
          {paused && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm">
              <p className="text-xl font-semibold text-gray-700">Pausa</p>
              <button
                type="button"
                onClick={togglePause}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                <Play size={20} className="fill-current" /> Reanudar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
