// Vocabulary provenance for materials — stored as content._vocab_source (JSONB, no migration).
// The label is display-ready so cards render it verbatim.

export interface VocabSource {
  kind: 'richmond' | 'letters' | 'custom'
  label: string
}

/** "Unidad 3 — Food" for one unit; "Unidades 2, 3" when the selection spans several. */
export function richmondSourceLabel(units: { unit_number: number; unit_title: string }[]): string {
  if (units.length === 0) return 'Richmond'
  if (units.length === 1) return `Unidad ${units[0].unit_number} — ${units[0].unit_title}`
  return `Unidades ${units.map((u) => u.unit_number).join(', ')}`
}

/** "Letras A · B" from the letters of the selected own-vocab words. */
export function lettersSourceLabel(
  selectedWords: string[],
  vocab: { word: string; letter?: string }[]
): string {
  const byWord = new Map(vocab.map((v) => [v.word.toLowerCase(), v.letter?.toUpperCase()]))
  const letters = Array.from(
    new Set(selectedWords.map((w) => byWord.get(w.toLowerCase())).filter(Boolean))
  ).sort() as string[]
  return letters.length ? `Letras ${letters.join(' · ')}` : 'Mi vocabulario'
}
