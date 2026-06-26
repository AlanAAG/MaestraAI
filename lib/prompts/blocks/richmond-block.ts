import type { SelectedRichmondContent } from '@/lib/richmond/types'

const bullets = (arr: string[]): string =>
  arr.length ? arr.map((x) => `- ${x}`).join('\n') : '- (sin contenido)'

// The <proni_unit> prompt block: the exact book vocabulary/phrases the AI must use for English
// (PRONI) activities + games. Empty string when no unit is selected → behavior identical to today.
export function buildRichmondBlock(content: SelectedRichmondContent | null): string {
  if (!content) return ''
  return `<proni_unit>
Libro: ${content.book_code} | Unidad ${content.unit_number}: "${content.unit_title}"
Lecciones: ${content.lesson_ranges.join(', ')}

Vocabulario (usar en actividades PRONI y juegos — no inventar vocab fuera de esta lista):
${content.vocabulary.length ? content.vocabulary.join(', ') : '(sin vocabulario cargado)'}

Frases modelo (usar como ejemplos de lenguaje en las actividades):
${bullets(content.language_models)}

Objetivos de aprendizaje:
${bullets(content.learning_goals)}
</proni_unit>`
}

// Short inline reinforcement appended to game-related sections (point-of-use, not just global rule).
export function buildGameVocabularyHint(content: SelectedRichmondContent | null): string {
  if (!content || content.vocabulary.length === 0) return ''
  return `(juegos de inglés deben usar: ${content.vocabulary.slice(0, 10).join(', ')})`
}
