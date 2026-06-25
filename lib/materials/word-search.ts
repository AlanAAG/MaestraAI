import WordSearch from '@blex41/word-search'

export type WordSearchResult = {
  grid: string[][]
  words: string[]
  gridSize: number
  wordPaths?: Array<Array<{ x: number; y: number }>>
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function lcg(seed: number): () => number {
  let s = seed | 0
  return function next(): number {
    s = (Math.imul(1664525, s) + 1013904223) | 0
    return s >>> 0
  }
}

function buildKinderWordSearch(vocabulary: string[]): WordSearchResult {
  const SIZE = 10
  const words = Array.from(new Set(vocabulary.map((w) => w.toUpperCase().replace(/[^A-Z]/g, ''))))
    .filter((w) => w.length >= 2 && w.length <= SIZE)
    .slice(0, 10)

  if (words.length === 0) throw new Error('Sin vocabulario para sopa de letras')

  // Content-based seed so different vocabulary yields different layouts (was near-static).
  const seedBase =
    words.reduce((a, w) => a + Array.from(w).reduce((s, c) => s + c.charCodeAt(0), 0), 0) +
    words.length * 131
  const rng = lcg(seedBase)
  const grid: string[][] = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill(''))
  const wordPaths: Array<Array<{ x: number; y: number }>> = []
  const placed: string[] = []
  // Horizontal (→) and vertical (↓) — kinder-friendly, no diagonals/reverse.
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
  ]

  for (const word of words) {
    let didPlace = false
    for (let attempt = 0; attempt < 60 && !didPlace; attempt++) {
      const dir = dirs[rng() % dirs.length]
      const maxX = SIZE - (dir.dx ? word.length : 1)
      const maxY = SIZE - (dir.dy ? word.length : 1)
      const x0 = rng() % (maxX + 1)
      const y0 = rng() % (maxY + 1)
      let collision = false
      for (let i = 0; i < word.length; i++) {
        const cell = grid[y0 + dir.dy * i][x0 + dir.dx * i]
        if (cell !== '' && cell !== word[i]) {
          collision = true
          break
        }
      }
      if (collision) continue
      const path: Array<{ x: number; y: number }> = []
      for (let i = 0; i < word.length; i++) {
        const x = x0 + dir.dx * i
        const y = y0 + dir.dy * i
        grid[y][x] = word[i]
        path.push({ x, y })
      }
      wordPaths.push(path)
      placed.push(word)
      didPlace = true
    }
    // Words that don't fit are dropped from `placed` (the UI lists only placed words).
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === '') grid[r][c] = ALPHA[rng() % 26]
    }
  }

  return { grid, words: placed, gridSize: SIZE, wordPaths }
}

type WsWord = { word: string; clean: string; path: Array<{ x: number; y: number }> }

export function buildWordSearch(
  vocabulary: string[],
  difficulty: 'kinder' | 'standard' = 'kinder'
): WordSearchResult {
  if (difficulty === 'kinder') return buildKinderWordSearch(vocabulary)

  const SIZE = 12
  const words = Array.from(new Set(vocabulary.map((w) => w.toUpperCase()))).slice(0, 20)
  if (words.length === 0) throw new Error('Sin vocabulario para sopa de letras')

  const ws = new WordSearch({ cols: SIZE, rows: SIZE, dictionary: words })
  const wsWords = ws.data.words as WsWord[]
  const placedWords = wsWords.map((w) => w.clean)
  const wordPaths = wsWords.map((w) => w.path)

  return { grid: ws.data.grid as string[][], words: placedWords, gridSize: SIZE, wordPaths }
}
