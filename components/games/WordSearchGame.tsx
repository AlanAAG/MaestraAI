'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Volume2, X } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { useSound } from '@/hooks/useSound'
import { celebrate } from '@/lib/ui/celebrate'
import { GameComplete } from '@/components/games/GameComplete'
import { VocabVisual } from '@/components/games/VocabVisual'

type WordSearchContent = {
  grid: string[][]
  words: string[]
  gridSize: number
  wordPaths?: Array<Array<{ x: number; y: number }>>
}

interface Props {
  content: WordSearchContent
  onComplete?: () => void
}

type Cell = { row: number; col: number }

export function WordSearchGame({ content, onComplete }: Props) {
  const { grid, words, wordPaths } = content
  const { speak } = useSpeech()
  const sfx = useSound()

  const [dragStart, setDragStart] = useState<Cell | null>(null)
  const [dragCells, setDragCells] = useState<Cell[]>([])
  const [foundWordKeys, setFoundWordKeys] = useState<Set<string>>(new Set())
  const [wrongFlash, setWrongFlash] = useState<Cell | null>(null)
  const [complete, setComplete] = useState(false)
  const [selected, setSelected] = useState<string | null>(null) // word shown in the flashcard popup

  const foundCells = useMemo(() => {
    const cells = new Set<string>()
    if (!wordPaths) return cells
    words.forEach((word, i) => {
      const path = wordPaths[i]
      if (!path) return
      if (foundWordKeys.has(word)) {
        path.forEach((p) => cells.add(`${p.y}-${p.x}`))
      }
    })
    return cells
  }, [foundWordKeys, wordPaths, words])

  const tryMatch = useCallback(
    (a: Cell, b: Cell) => {
      if (!wordPaths) return false
      for (let i = 0; i < words.length; i++) {
        const path = wordPaths[i]
        if (!path || path.length < 2) continue
        const start = { row: path[0].y, col: path[0].x }
        const end = { row: path[path.length - 1].y, col: path[path.length - 1].x }
        const matchesFwd =
          a.row === start.row && a.col === start.col && b.row === end.row && b.col === end.col
        const matchesRev =
          b.row === start.row && b.col === start.col && a.row === end.row && a.col === end.col
        if (matchesFwd || matchesRev) {
          const word = words[i]
          setFoundWordKeys((prev) => {
            const next = new Set(prev)
            next.add(word)
            return next
          })
          speak(word, 'en-US')
          sfx.correct()
          return true
        }
      }
      return false
    },
    [words, wordPaths, speak, sfx]
  )

  // Straight horizontal/vertical line of cells from start to end (kinder grid has no diagonals).
  function lineCells(start: Cell, end: Cell): Cell[] {
    if (start.row === end.row) {
      const [a, b] = [start.col, end.col].sort((x, y) => x - y)
      return Array.from({ length: b - a + 1 }, (_, i) => ({ row: start.row, col: a + i }))
    }
    if (start.col === end.col) {
      const [a, b] = [start.row, end.row].sort((x, y) => x - y)
      return Array.from({ length: b - a + 1 }, (_, i) => ({ row: a + i, col: start.col }))
    }
    return [start]
  }

  // Hit-test the cell under a pointer (works for touch, where pointerenter on siblings won't fire).
  function cellFromPoint(x: number, y: number): Cell | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const r = el?.dataset?.r
    const c = el?.dataset?.c
    if (r === undefined || c === undefined) return null
    return { row: Number(r), col: Number(c) }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (complete) return
    const cell = cellFromPoint(e.clientX, e.clientY)
    if (!cell) return
    setDragStart(cell)
    setDragCells([cell])
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart) return
    const cell = cellFromPoint(e.clientX, e.clientY)
    if (cell) setDragCells(lineCells(dragStart, cell))
  }

  function onPointerUp() {
    if (!dragStart) return
    const end = dragCells[dragCells.length - 1]
    if (dragCells.length >= 2 && !tryMatch(dragStart, end)) {
      setWrongFlash(end)
      sfx.wrong()
      setTimeout(() => setWrongFlash(null), 400)
    }
    setDragStart(null)
    setDragCells([])
  }

  useEffect(() => {
    if (foundWordKeys.size > 0 && foundWordKeys.size >= words.length) {
      setComplete(true)
      sfx.win()
      celebrate()
      onComplete?.()
    }
  }, [foundWordKeys, words.length, onComplete, sfx])

  const remainingWords = words.filter((w) => !foundWordKeys.has(w))

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {complete ? (
        <GameComplete title="¡Encontraste todas!" />
      ) : (
        <>
          {/* Grid — drag (mouse or finger) across letters to select a word */}
          <div
            className="inline-grid gap-0.5 select-none touch-none"
            style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 8}, minmax(0, 1fr))` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {grid.map((row, r) =>
              row.map((letter, c) => {
                const key = `${r}-${c}`
                const isSelected = dragCells.some((d) => d.row === r && d.col === c)
                const isFound = foundCells.has(key)
                const isWrong = wrongFlash?.row === r && wrongFlash?.col === c

                return (
                  <div
                    key={key}
                    data-r={r}
                    data-c={c}
                    className={[
                      'flex items-center justify-center rounded font-bold transition-colors cursor-pointer',
                      'h-[clamp(2.75rem,7vmin,4rem)] w-[clamp(2.75rem,7vmin,4rem)] text-[clamp(1.1rem,3.5vmin,1.75rem)]',
                      isFound
                        ? 'bg-emerald-400 text-white'
                        : isSelected
                          ? 'bg-indigo-500 text-white'
                          : isWrong
                            ? 'bg-red-300 text-white'
                            : 'bg-gray-100 text-gray-800',
                    ].join(' ')}
                  >
                    {letter}
                  </div>
                )
              })
            )}
          </div>

          {/* Word list with a picture hint per word — bigger, and tap to open the flashcard */}
          <div className="flex max-w-xl flex-wrap justify-center gap-2.5">
            {words.map((word) => (
              <button
                type="button"
                key={word}
                onClick={() => setSelected(word)}
                title="Toca para ver la tarjeta"
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold transition-all hover:scale-105 active:scale-95 ${
                  foundWordKeys.has(word)
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 line-through opacity-60'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                }`}
              >
                <VocabVisual
                  word={word}
                  className="h-8 w-8"
                  emojiClassName="text-3xl leading-none"
                />
                {word}
              </button>
            ))}
          </div>

          {remainingWords.length > 0 && (
            <p className="text-xs text-gray-400">
              {remainingWords.length} palabra{remainingWords.length !== 1 ? 's' : ''} por encontrar
            </p>
          )}
        </>
      )}

      {selected && (
        <WordFlashcard word={selected} onClose={() => setSelected(null)} speak={speak} />
      )}
    </div>
  )
}

// Big flashcard popup for a word: large picture (the meaning for pre-readers), spelling, and
// tap-to-hear pronunciation. Word search content only stores the word, so the rest is derived
// (image via VocabVisual, pronunciation via TTS, spelling from the letters).
function WordFlashcard({
  word,
  onClose,
  speak,
}: {
  word: string
  onClose: () => void
  speak: (text: string, lang?: 'en-US' | 'es-MX') => void
}) {
  // Pronounce it once on open.
  useEffect(() => {
    speak(word, 'en-US')
  }, [word, speak])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {/* Picture = meaning for pre-readers */}
        <div className="mx-auto mb-3 flex h-40 w-40 items-center justify-center rounded-2xl bg-gray-50">
          <VocabVisual word={word} className="h-32 w-32" emojiClassName="text-8xl leading-none" />
        </div>

        <h3 className="text-3xl font-extrabold uppercase tracking-wide text-gray-800">{word}</h3>

        {/* Spelling */}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {word
            .toUpperCase()
            .split('')
            .map((ch, i) => (
              <span
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-lg font-bold text-indigo-700"
              >
                {ch}
              </span>
            ))}
        </div>

        {/* Pronunciation */}
        <button
          type="button"
          onClick={() => speak(word, 'en-US')}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
        >
          <Volume2 size={20} /> Escuchar
        </button>
      </div>
    </div>
  )
}
