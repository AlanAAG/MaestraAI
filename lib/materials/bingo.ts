// Pure algorithm — no Claude needed.

export type BingoCard = {
  card: string[][]
  studentNumber: number
}

export type BingoResult = {
  cards: BingoCard[]
  vocabulary: string[]
  freeSpace: boolean
  gridSize: 3 | 5
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function generateUniqueCard(
  vocabulary: string[],
  seed: number,
  freeSpace: boolean,
  gridSize: 3 | 5 = 3
): string[][] {
  const shuffled = seededShuffle(vocabulary, seed)
  const grid: string[][] = []
  const center = (gridSize - 1) >> 1
  let idx = 0

  for (let row = 0; row < gridSize; row++) {
    grid.push([])
    for (let col = 0; col < gridSize; col++) {
      const isCenter = row === center && col === center
      if (isCenter && freeSpace) {
        grid[row].push('FREE')
      } else {
        grid[row].push(shuffled[idx % shuffled.length])
        idx++
      }
    }
  }
  return grid
}

export function generateAllCards(
  vocabulary: string[],
  count: number,
  freeSpace: boolean,
  gridSize: 3 | 5 = 3
): BingoResult {
  if (vocabulary.length === 0) throw new Error('Se necesita al menos una palabra para el bingo')
  const clampedCount = Math.min(Math.max(count, 1), 35)

  const cards: BingoCard[] = []
  const seen = new Set<string>()

  for (let i = 0; i < clampedCount; i++) {
    let seed = i + 1
    let card = generateUniqueCard(vocabulary, seed, freeSpace, gridSize)
    let key = JSON.stringify(card)

    // Collision handling (rare with small vocab)
    let attempts = 0
    while (seen.has(key) && attempts < 100) {
      seed += clampedCount
      card = generateUniqueCard(vocabulary, seed, freeSpace, gridSize)
      key = JSON.stringify(card)
      attempts++
    }

    seen.add(key)
    cards.push({ card, studentNumber: i + 1 })
  }

  return { cards, vocabulary, freeSpace, gridSize }
}
