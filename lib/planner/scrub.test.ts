import { describe, it, expect } from 'vitest'
import { scrubNames } from './extract-template'

describe('scrubNames (LFPDPPP fallback scrub)', () => {
  it('replaces Nombre Apellido student-name shapes', () => {
    expect(scrubNames('Regina Martínez participó con entusiasmo.')).toBe(
      'Alumno participó con entusiasmo.'
    )
    expect(scrubNames('Apoyar a Juan Carlos Pérez en el trazo.')).toBe(
      'Apoyar a Alumno en el trazo.'
    )
  })
  it('leaves single capitalized words (sentence starts) intact', () => {
    expect(scrubNames('Trabajaré el proyecto con el grupo.')).toBe(
      'Trabajaré el proyecto con el grupo.'
    )
  })
})
