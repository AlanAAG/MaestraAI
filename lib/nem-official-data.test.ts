import { describe, it, expect } from 'vitest'
import { isProniApplicable } from './nem-official-data'

describe('isProniApplicable', () => {
  // Both names mean tercer grado; "Preprimaria" being excluded hid the Richmond selector.
  it('covers both names schools use for tercer grado', () => {
    expect(isProniApplicable('Kinder 3')).toBe(true)
    expect(isProniApplicable('Preprimaria')).toBe(true)
  })

  it('stays off for the younger grades', () => {
    for (const g of ['Maternal', 'Kinder 1', 'Kinder 2', '']) {
      expect(isProniApplicable(g), g).toBe(false)
    }
  })
})
