import WordSearch from '@blex41/word-search'

export type WordSearchResult = {
  grid: string[][]
  words: string[]
  gridSize: number
}

export function buildWordSearch(vocabulary: string[], gridSize = 12): WordSearchResult {
  const words = Array.from(new Set(vocabulary.map((w) => w.toUpperCase()))).slice(0, 20)
  if (words.length === 0) throw new Error('Sin vocabulario para sopa de letras')

  const ws = new WordSearch({ cols: gridSize, rows: gridSize, dictionary: words })

  const grid: string[][] = ws.data.grid as string[][]

  return {
    grid,
    words: vocabulary.slice(0, 20),
    gridSize,
  }
}
