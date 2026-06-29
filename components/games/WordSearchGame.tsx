'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

          {/* Word list with a picture hint per word (pre-literate kids find by image) */}
          <div className="flex max-w-sm flex-wrap justify-center gap-2">
            {words.map((word) => (
              <span
                key={word}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all ${
                  foundWordKeys.has(word)
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 line-through opacity-60'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                <VocabVisual
                  word={word}
                  className="h-5 w-5"
                  emojiClassName="text-lg leading-none"
                />
                {word}
              </span>
            ))}
          </div>

          {remainingWords.length > 0 && (
            <p className="text-xs text-gray-400">
              {remainingWords.length} palabra{remainingWords.length !== 1 ? 's' : ''} por encontrar
            </p>
          )}
        </>
      )}
    </div>
  )
}
