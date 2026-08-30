import { describe, it, expect } from 'vitest'
import { ENFOQUES, ENFOQUE_DEFAULT, getEnfoque, enfoqueBlock, enfoqueLabel } from './enfoques'
import { METHODOLOGY_STRUCTURE } from './methodologies'

describe('ENFOQUES catalogue', () => {
  it('has unique slugs', () => {
    const slugs = ENFOQUES.map((e) => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every entry is fully filled in for the picker', () => {
    for (const e of ENFOQUES) {
      expect(e.label, e.slug).toBeTruthy()
      expect(e.summary, e.slug).toBeTruthy()
      expect(e.detail, e.slug).toBeTruthy()
    }
  })

  it('the default is a real entry and carries no prompt', () => {
    const base = getEnfoque(ENFOQUE_DEFAULT)
    expect(base).not.toBeNull()
    // 'nem' means "no extra lens" — injecting anything would change plain NEM output.
    expect(base!.prompt).toBe('')
  })

  it('every non-default enfoque has a prompt block', () => {
    for (const e of ENFOQUES.filter((x) => x.slug !== ENFOQUE_DEFAULT)) {
      expect(e.prompt, e.slug).toContain('<enfoque_pedagogico')
      expect(e.prompt.length, e.slug).toBeGreaterThan(300)
    }
  })

  it('marks the SEP-endorsed frameworks as official', () => {
    // DUA is SEP policy for atención a la diversidad; SEL maps onto the NEM campos/ejes.
    expect(getEnfoque('dua')?.official).toBe(true)
    expect(getEnfoque('socioemocional')?.official).toBe(true)
  })

  it('does not collide with a metodología name — the two axes must stay separate', () => {
    const methodologies = new Set(Object.keys(METHODOLOGY_STRUCTURE).map((m) => m.toLowerCase()))
    for (const e of ENFOQUES) {
      expect(methodologies.has(e.label.toLowerCase()), e.label).toBe(false)
    }
  })

  it('no prompt block contradicts the NEM hard rules', () => {
    for (const e of ENFOQUES) {
      // Numeric grading is banned everywhere in the product.
      expect(e.prompt, e.slug).not.toMatch(/calificación numérica|porcentaje de logro/i)
      // The enfoque must not claim authority over contenidos/PDA — those are verbatim.
      expect(e.prompt, e.slug).not.toMatch(/inventa (un |una )?(contenido|PDA)/i)
    }
  })
})

describe('enfoqueBlock', () => {
  it('returns the block for a known slug', () => {
    expect(enfoqueBlock('montessori')).toContain('Montessori')
    expect(enfoqueBlock('dua')).toContain('PARTICIPACIÓN')
  })

  it('is empty for the default, unknown slugs and nullish input', () => {
    // Anything unrecognised must degrade to plain NEM, never throw.
    expect(enfoqueBlock(ENFOQUE_DEFAULT)).toBe('')
    expect(enfoqueBlock('no-existe')).toBe('')
    expect(enfoqueBlock(null)).toBe('')
    expect(enfoqueBlock(undefined)).toBe('')
    expect(enfoqueBlock('')).toBe('')
  })
})

describe('enfoqueLabel', () => {
  it('returns the label, or empty for unknown', () => {
    expect(enfoqueLabel('reggio')).toBe('Reggio Emilia')
    expect(enfoqueLabel('no-existe')).toBe('')
    expect(enfoqueLabel(null)).toBe('')
  })
})
