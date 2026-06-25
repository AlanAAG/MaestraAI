'use client'
import { useState } from 'react'
import { WordSearchGame } from './WordSearchGame'
import { StudentBingoCard } from './StudentBingoCard'
import { MemoryMatch } from './MemoryMatch'
import { PictureWordMatch } from './PictureWordMatch'
import { SortingGame } from './SortingGame'
import { GameComplete } from './GameComplete'

const GAME_TITLES: Record<string, string> = {
  word_search: 'Sopa de Letras',
  bingo: 'Bingo',
  memory_game: 'Memorama',
  flashcards: 'Flashcards',
  picture_word_match: '¿Cuál es la palabra?',
  sorting_game: 'Ordena y clasifica',
}

interface Props {
  type: string
  content: Record<string, unknown>
  vocabulary: string[]
}

export function GameShell({ type, content, vocabulary }: Props) {
  const [done, setDone] = useState(false)

  const title = GAME_TITLES[type] ?? 'Juego'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h1 className="font-semibold text-gray-800">{title}</h1>
        {vocabulary.length > 0 && (
          <span className="text-xs text-gray-400">{vocabulary.length} palabras</span>
        )}
      </div>

      {done ? (
        <GameComplete title="¡Muy bien!" onReplay={() => setDone(false)} />
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
      ) : (
        <div className="p-8 text-center text-gray-400">
          <p className="text-sm">Este tipo de juego no está disponible en modo alumno todavía.</p>
        </div>
      )}
    </div>
  )
}
