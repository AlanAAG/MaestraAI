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
