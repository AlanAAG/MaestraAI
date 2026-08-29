import { describe, it, expect } from 'vitest'
import { bandForGrade, bandLabel, portageBlock } from './portage'
import { PORTAGE_MILESTONES } from './portage-data'

describe('bandForGrade', () => {
  it('maps each school grade to its Portage age band', () => {
    expect(bandForGrade('Maternal')).toBe('2-3')
    expect(bandForGrade('Kinder 1')).toBe('3-4')
    expect(bandForGrade('Kinder 2')).toBe('4-5')
    expect(bandForGrade('Kinder 3')).toBe('5-6')
    expect(bandForGrade('Preprimaria')).toBe('5-6')
  })

  it('defaults to 5-6 (Kinder 3 persona) for missing or unknown grades', () => {
    expect(bandForGrade(null)).toBe('5-6')
    expect(bandForGrade(undefined)).toBe('5-6')
    expect(bandForGrade('')).toBe('5-6')
    expect(bandForGrade('otro')).toBe('5-6')
  })

  it('is case-insensitive', () => {
    expect(bandForGrade('kinder 1')).toBe('3-4')
    expect(bandForGrade('KINDER 2')).toBe('4-5')
  })
})

describe('bandLabel', () => {
  it('renders the band in Spanish', () => {
    expect(bandLabel('3-4')).toBe('3 a 4 años')
  })
})

describe('portageBlock', () => {
  it('injects the milestones for the grade, not another band', () => {
    const k1 = portageBlock('Kinder 1')
    expect(k1).toContain('edad="3 a 4 años"')
    // A 3-4 Lenguaje milestone is present...
    expect(k1).toContain('Dice su nombre completo cuando se le pide')
    // ...and a 5-6 one is not.
    expect(k1).not.toContain('Dice el numero de su teléfono')
  })

  it('covers every area that has milestones for the band', () => {
    const block = portageBlock('Kinder 3')
    for (const area of Object.keys(PORTAGE_MILESTONES['5-6'])) {
      expect(block).toContain(`${area}:`)
    }
  })

  it('states the guardrail that milestones are not NEM curriculum', () => {
    // Without this the model cites Portage items as official contenidos/PDA.
    const block = portageBlock('Kinder 2')
    expect(block).toContain('NO son contenidos ni PDA')
    expect(block).toMatch(/NUNCA los cites como currículo oficial/)
  })
})
