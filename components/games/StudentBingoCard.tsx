'use client'
import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useSound } from '@/hooks/useSound'
import { celebrate } from '@/lib/ui/celebrate'
import { seededShuffle } from '@/lib/utils/shuffle'

type BingoContent = {
  vocabulary: string[]
  free_space: boolean
  grid_size: 3 | 5
  card_count?: number
}

interface Props {
  content: BingoContent
}

function buildCard(
  vocabulary: string[],
  seed: number,
  freeSpace: boolean,
  size: 3 | 5
): string[][] {
  const shuffled = seededShuffle(vocabulary, seed)
  const needed = size * size - (freeSpace ? 1 : 0)
  const words = shuffled.slice(0, needed)
  const grid: string[][] = []
  let idx = 0
  const center = Math.floor(size / 2)
  for (let r = 0; r < size; r++) {
    const row: string[] = []
    for (let c = 0; c < size; c++) {
      if (freeSpace && r === center && c === center) {
        row.push('FREE')
      } else {
        row.push(words[idx++] ?? '')
      }
    }
    grid.push(row)
  }
  return grid
}

function checkBingo(marked: Set<string>, size: number): boolean {
  const isMarked = (r: number, c: number) => marked.has(`${r}-${c}`)

  // rows
  for (let r = 0; r < size; r++) {
    if (Array.from({ length: size }, (_, c) => isMarked(r, c)).every(Boolean)) return true
  }
  // cols
  for (let c = 0; c < size; c++) {
    if (Array.from({ length: size }, (_, r) => isMarked(r, c)).every(Boolean)) return true
  }
  // diagonals
  if (Array.from({ length: size }, (_, i) => isMarked(i, i)).every(Boolean)) return true
  if (Array.from({ length: size }, (_, i) => isMarked(i, size - 1 - i)).every(Boolean)) return true

  return false
}

export function StudentBingoCard({ content }: Props) {
  const { vocabulary, free_space, grid_size } = content
  const size: 3 | 5 = grid_size ?? 3

  const [seatNumber, setSeatNumber] = useState<number | null>(null)
  const [seatInput, setSeatInput] = useState('')
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [hasBingo, setHasBingo] = useState(false)
  const sfx = useSound()

  useEffect(() => {
    if (hasBingo) {
      sfx.win()
      celebrate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBingo])

  const card =
    seatNumber !== null ? buildCard(vocabulary, seatNumber * 37 + 13, free_space, size) : null

  function handleSeatSubmit() {
    const n = parseInt(seatInput, 10)
    if (!n || n < 1 || n > 99) return
    setSeatNumber(n)
    setMarked(new Set())
    setHasBingo(false)
  }

  function handleCellTap(row: number, col: number) {
    if (!card) return
    const cell = card[row][col]
    if (cell === 'FREE') return // always marked

    const key = `${row}-${col}`
    const next = new Set(marked)
    if (next.has(key)) {
      next.delete(key)
      setHasBingo(checkBingo(next, size))
    } else {
      next.add(key)
      if (checkBingo(next, size)) setHasBingo(true)
    }
    setMarked(next)
  }

  if (!seatNumber || !card) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">¿Cuál es tu número?</p>
          <p className="text-sm text-gray-400 mt-1">Cada alumno tiene una tarjeta única</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="number"
            min={1}
            max={99}
            value={seatInput}
            onChange={(e) => setSeatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSeatSubmit()}
            className="w-20 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl py-3 focus:border-indigo-500 focus:outline-none"
            placeholder="1"
            autoFocus
          />
          <button
            onClick={handleSeatSubmit}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium text-lg min-h-[52px] min-w-[100px] transition-colors"
          >
            ¡Jugar!
          </button>
        </div>
      </div>
    )
  }

  const center = Math.floor(size / 2)

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {hasBingo && (
        <div className="bg-yellow-400 text-yellow-900 font-bold text-2xl px-8 py-3 rounded-2xl animate-bounce">
          ¡BINGO! 🌟
        </div>
      )}

      <p className="text-sm text-gray-400 font-medium">Tarjeta #{seatNumber}</p>

      <div
        className="inline-grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {card.map((row, r) =>
          row.map((word, c) => {
            const isFree = free_space && r === center && c === center
            const key = `${r}-${c}`
            const isMarked = isFree || marked.has(key)

            return (
              <button
                key={key}
                onClick={() => handleCellTap(r, c)}
                className={[
                  'flex items-center justify-center rounded-xl border-2 font-semibold text-center p-1 transition-all',
                  size === 3 ? 'h-20 w-20 text-lg' : 'h-16 w-16 text-sm',
                  isFree
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-600'
                    : isMarked
                      ? 'bg-indigo-500 border-indigo-600 text-white scale-95'
                      : 'bg-white border-gray-300 text-gray-800 active:bg-indigo-50',
                ].join(' ')}
              >
                {isFree ? <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> : word}
              </button>
            )
          })
        )}
      </div>

      <button
        onClick={() => {
          setSeatNumber(null)
          setSeatInput('')
        }}
        className="text-xs text-gray-400 hover:text-gray-600 underline mt-2"
      >
        Cambiar número
      </button>
    </div>
  )
}
