import { describe, it, expect } from 'vitest'
import { buildSubplanPrompt } from './subplan'

const fn = {
  project_name: 'Mi Familia',
  monthly_value: 'Respeto',
  letter_week1: 'Mm',
  letter_week2: 'Pp',
}

describe('buildSubplanPrompt', () => {
  it('Letters sub-plan forbids number content and is framed as letters-only', () => {
    const p = buildSubplanPrompt(fn, 'letter_number', '', 'martes', 'jueves', true)
    expect(p).toContain('EXCLUSIVAMENTE de LETRAS')
    expect(p).toMatch(/NUNCA menciones números/)
    expect(p).not.toContain('LETTER & NUMBER')
  })

  it('Números sub-plan is about numbers', () => {
    const p = buildSubplanPrompt(fn, 'numeros', '', 'martes', 'jueves', true)
    expect(p).toContain('NÚMEROS')
  })
})

describe('numeros sub-plan uses the teacher numbers', () => {
  it('injects the per-week numbers verbatim when declared', () => {
    const p = buildSubplanPrompt(
      { project_name: 'P', monthly_value: 'V', number_week1: '1-10', number_week2: '11-20' },
      'numeros',
      '',
      'martes',
      'jueves',
      false
    )
    expect(p).toContain('NÚMEROS A TRABAJAR')
    expect(p).toContain('Semana 1: 1-10')
    expect(p).toContain('Semana 2: 11-20')
  })

  it('omits the block when no numbers were declared (AI picks the progression)', () => {
    const p = buildSubplanPrompt(
      { project_name: 'P', monthly_value: 'V' },
      'numeros',
      '',
      'martes',
      'jueves',
      false
    )
    expect(p).not.toContain('NÚMEROS A TRABAJAR')
  })
})
