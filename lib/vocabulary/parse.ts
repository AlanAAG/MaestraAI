export type VocabItem = { word: string; letter: string; color: string }
export const VOCAB_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange']

// Deterministic parser for letter-grouped / comma vocabulary lists — no LLM, no truncation.
// Handles: single-letter headers on their own line ("A" then words below), inline
// "A: apple, ant", and plain comma/line lists (letter derived from the word's first char).
export function parseLetterGrouped(text: string): VocabItem[] {
  const items: VocabItem[] = []
  const seen = new Set<string>()
  let current: string | null = null
  let ci = 0
  const push = (raw: string, letter: string | null) => {
    const word = raw.toLowerCase().trim()
    if (!word || word.length > 50 || !/^[a-záéíóúñü][a-záéíóúñü' -]*$/i.test(word)) return
    const l = (letter ?? word[0]).toUpperCase()
    if (!/^[A-Z]$/.test(l)) return
    const key = `${l}:${word}`
    if (seen.has(key)) return
    seen.add(key)
    items.push({ word, letter: l, color: VOCAB_COLORS[ci++ % VOCAB_COLORS.length] })
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const header = line.match(/^([A-Za-z])\s*[:.)]?$/) // "A", "A:", "A."
    if (header) {
      current = header[1]
      continue
    }
    const inline = line.match(/^([A-Za-z])\s*[:.)]\s*(.+)$/) // "A: apple, ant"
    if (inline) {
      current = inline[1]
      for (const w of inline[2].split(/[,;]/)) push(w, current)
      continue
    }
    for (const w of line.split(/[,;]/)) push(w, current)
  }
  return items
}

// Clamp raw LLM-extracted items to what the save schema accepts, so one odd value
// (a color like "rojo", a >50-char word, an accented/multi-char letter) can't reject
// the whole batch when it's saved. Drops items with no A-Z first letter.
export function clampVocabItems(raw: unknown[]): VocabItem[] {
  const out: VocabItem[] = []
  for (const r of raw) {
    const it = (r ?? {}) as Partial<VocabItem>
    const word = String(it.word ?? '')
      .trim()
      .slice(0, 50)
    if (!word) continue
    const letter = String(it.letter ?? word)
      .toUpperCase()
      .match(/[A-Z]/)
    if (!letter) continue
    const color = VOCAB_COLORS.includes(String(it.color)) ? (it.color as string) : 'blue'
    out.push({ word: word.toLowerCase(), letter: letter[0], color })
  }
  return out
}
