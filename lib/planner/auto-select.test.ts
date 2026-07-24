import { describe, it, expect } from 'vitest'
import { extractRecentChoices, METODOLOGIAS_VALIDAS } from './auto-select'

describe('extractRecentChoices', () => {
  it('dedupes and skips the Automático placeholder + non-strings', () => {
    const units = [
      { metodologia: 'Proyecto', ejes: ['Inclusión', 'Vida saludable'], contenidos: ['A', 'B'] },
      { metodologia: 'Automático', ejes: ['Inclusión'], contenidos: ['A'] }, // placeholder skipped, dups deduped
      { metodologia: 'Taller Crítico', ejes: [], contenidos: ['C'] },
      { metodologia: 42, ejes: [1, 'Artes y experiencias estéticas'], contenidos: null }, // junk filtered
      null,
    ]
    const r = extractRecentChoices(units)
    expect(r.metodologias.sort()).toEqual(['Proyecto', 'Taller Crítico'])
    expect(r.ejes.sort()).toEqual(['Artes y experiencias estéticas', 'Inclusión', 'Vida saludable'])
    expect(r.contenidos.sort()).toEqual(['A', 'B', 'C'])
  })

  it('empty input → empty choices', () => {
    expect(extractRecentChoices([])).toEqual({ metodologias: [], ejes: [], contenidos: [] })
  })

  it('valid methodologies exclude the Asamblea placeholder and include the official ones', () => {
    expect(METODOLOGIAS_VALIDAS).toContain('Proyecto')
    expect(METODOLOGIAS_VALIDAS).toContain('Centro de Interés')
    expect(METODOLOGIAS_VALIDAS).not.toContain('Asamblea')
  })
})
