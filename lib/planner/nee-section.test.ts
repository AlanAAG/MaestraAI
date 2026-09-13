import { describe, it, expect } from 'vitest'
import { buildNeeSection } from './nee-section'

describe('buildNeeSection', () => {
  it('lists roster students with their support notes', () => {
    const out = buildNeeSection([{ display_name: 'Alumno A', nee_notes: 'apoyos visuales' }])
    expect(out).toContain('ALUMNOS CON NEE')
    expect(out).toContain('- Alumno A: apoyos visuales')
  })

  it('uses the teacher free text when the roster is empty', () => {
    // The reported bug: no students entered meant the plan always claimed there were no NEE.
    const out = buildNeeSection([], 'Un niño con TDAH, necesita consignas cortas.')
    expect(out).toContain('ALUMNOS CON NEE')
    expect(out).toContain('TDAH')
    expect(out).not.toContain('ninguno identificado')
  })

  it('combines both sources', () => {
    const out = buildNeeSection([{ display_name: 'Alumno A' }], 'otro caso de lenguaje')
    expect(out).toContain('Alumno A')
    expect(out).toContain('otro caso de lenguaje')
  })

  it('scrubs names out of the free text before it reaches the model', () => {
    const out = buildNeeSection([], 'Diego Martinez necesita pausas frecuentes')
    expect(out).not.toContain('Diego')
    expect(out).toContain('necesita pausas frecuentes')
  })

  it('falls back to the universal-design rule when there is nothing', () => {
    const out = buildNeeSection([], null, 'REGLA')
    expect(out).toBe('NEE: ninguno identificado en este grupo. REGLA')
    expect(buildNeeSection([], '   ', 'REGLA')).toContain('ninguno identificado')
  })

  it('caps very long free text', () => {
    const out = buildNeeSection([], 'a'.repeat(5000))
    expect(out.length).toBeLessThan(2000)
  })
})
