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
  const SIZE = 8
  const words = Array.from(new Set(vocabulary.map((w) => w.toUpperCase())))
    .filter((w) => w.length <= SIZE)
    .slice(0, 8)

  if (words.length === 0) throw new Error('Sin vocabulario para sopa de letras')

  const rng = lcg(words.join('').length * 31 + words.length * 7)
  const grid: string[][] = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill(''))
  const wordPaths: Array<Array<{ x: number; y: number }>> = []
  const placed: string[] = []
  let currentRow = 0

  for (const word of words) {
    if (currentRow >= SIZE) break
    const maxCol = SIZE - word.length
    let didPlace = false

    for (let attempt = 0; attempt < 20 && !didPlace; attempt++) {
      const col = rng() % (maxCol + 1)
      let collision = false
      for (let i = 0; i < word.length; i++) {
        const existing = grid[currentRow][col + i]
        if (existing !== '' && existing !== word[i]) {
          collision = true
          break
        }
      }
      if (!collision) {
        const path: Array<{ x: number; y: number }> = []
        for (let i = 0; i < word.length; i++) {
          grid[currentRow][col + i] = word[i]
          path.push({ x: col + i, y: currentRow })
        }
        wordPaths.push(path)
        placed.push(word)
        didPlace = true
      }
    }
    if (didPlace) currentRow++
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHA[rng() % 26]
      }
    }
  }

  return { grid, words: placed, gridSize: SIZE, wordPaths }
}

export function buildWordSearch(
  vocabulary: string[],
  difficulty: 'kinder' | 'standard' = 'kinder'
): WordSearchResult {
  if (difficulty === 'kinder') return buildKinderWordSearch(vocabulary)

  const SIZE = 12
  const words = Array.from(new Set(vocabulary.map((w) => w.toUpperCase()))).slice(0, 20)
  if (words.length === 0) throw new Error('Sin vocabulario para sopa de letras')

  const ws = new WordSearch({ cols: SIZE, rows: SIZE, dictionary: words })
  return { grid: ws.data.grid as string[][], words: vocabulary.slice(0, 20), gridSize: SIZE }
}
