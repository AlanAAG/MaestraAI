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

describe('sub-plan prompts consume attachment RAG fragments', () => {
  const base = { project_name: 'P', monthly_value: 'V' }
  it('letters prompt carries its fragments; numeros prompt its own', () => {
    const fn = {
      ...base,
      __attachRagLetters:
        '<fragmentos_de_archivos_letters>\n• Página 12: trazo de la M\n</fragmentos_de_archivos_letters>',
      __attachRagNumeros:
        '<fragmentos_de_archivos_numeros>\n• Conteo del 1 al 30\n</fragmentos_de_archivos_numeros>',
    }
    const pl = buildSubplanPrompt(fn, 'letter_number', '', 'martes', 'jueves', false)
    const pn = buildSubplanPrompt(fn, 'numeros', '', 'martes', 'jueves', false)
    expect(pl).toContain('trazo de la M')
    expect(pl).not.toContain('Conteo del 1 al 30')
    expect(pn).toContain('Conteo del 1 al 30')
    expect(pn).not.toContain('trazo de la M')
  })
  it('clean prompts when no fragments were retrieved', () => {
    const p = buildSubplanPrompt(base, 'letter_number', '', 'martes', 'jueves', false)
    expect(p).not.toContain('fragmentos_de_archivos')
  })
})
