'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'

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

  const [firstTap, setFirstTap] = useState<Cell | null>(null)
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
          return true
        }
      }
      return false
    },
    [words, wordPaths, speak]
  )

  function handleCellTap(row: number, col: number) {
    if (complete) return
    const cell: Cell = { row, col }

    if (!firstTap) {
      setFirstTap(cell)
      return
    }

    if (firstTap.row === row && firstTap.col === col) {
      setFirstTap(null)
      return
    }

    const matched = tryMatch(firstTap, cell)
    if (!matched) {
      setWrongFlash(cell)
      setTimeout(() => setWrongFlash(null), 400)
    }
    setFirstTap(null)
  }

  useEffect(() => {
    if (foundWordKeys.size > 0 && foundWordKeys.size >= words.length) {
      setComplete(true)
      onComplete?.()
    }
  }, [foundWordKeys, words.length, onComplete])

  const remainingWords = words.filter((w) => !foundWordKeys.has(w))

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {complete ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
          <p className="text-2xl font-bold text-gray-800">¡Encontraste todas!</p>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div
            className="inline-grid gap-0.5 select-none"
            style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 8}, minmax(0, 1fr))` }}
          >
            {grid.map((row, r) =>
              row.map((letter, c) => {
                const key = `${r}-${c}`
                const isFirst = firstTap?.row === r && firstTap?.col === c
                const isFound = foundCells.has(key)
                const isWrong = wrongFlash?.row === r && wrongFlash?.col === c

                return (
                  <button
                    key={key}
                    onClick={() => handleCellTap(r, c)}
                    className={[
                      'flex items-center justify-center rounded font-bold text-sm transition-all',
                      'h-9 w-9 min-h-[36px] min-w-[36px]',
                      isFound
                        ? 'bg-emerald-400 text-white'
                        : isFirst
                          ? 'bg-indigo-500 text-white scale-110'
                          : isWrong
                            ? 'bg-red-300 text-white'
                            : 'bg-gray-100 text-gray-800 active:bg-indigo-100',
                    ].join(' ')}
                  >
                    {letter}
                  </button>
                )
              })
            )}
          </div>

          {/* Word list */}
          <div className="flex flex-wrap justify-center gap-2 max-w-sm">
            {words.map((word) => (
              <span
                key={word}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                  foundWordKeys.has(word)
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 line-through opacity-60'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
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
