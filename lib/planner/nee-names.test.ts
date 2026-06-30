import { describe, it, expect } from 'vitest'
import { applyNeeNames } from './nee-names'

describe('applyNeeNames', () => {
  it('swaps each label for its real name', () => {
    const text = 'Para Alumno A: ubicarla cerca. Alumno B: repetir indicaciones.'
    const out = applyNeeNames(text, { 'Alumno A': 'Regina G.', 'Alumno B': 'Aitana M.' })
    expect(out).toBe('Para Regina G.: ubicarla cerca. Aitana M.: repetir indicaciones.')
  })

  it('replaces every occurrence of a label', () => {
    const out = applyNeeNames('Alumno A y Alumno A otra vez', { 'Alumno A': 'Regina' })
    expect(out).toBe('Regina y Regina otra vez')
  })

  it('no-ops with an empty map or empty text', () => {
    expect(applyNeeNames('Alumno A', {})).toBe('Alumno A')
    expect(applyNeeNames('', { 'Alumno A': 'Regina' })).toBe('')
  })

  it('does not let a shorter label clobber a longer one (longest-first)', () => {
    // contrived multi-label safety: "Alumno 2" must not eat into "Alumno 27"
    const out = applyNeeNames('Alumno 27 trabaja', { 'Alumno 2': 'X', 'Alumno 27': 'Diego' })
    expect(out).toBe('Diego trabaja')
  })
})
