import { describe, it, expect } from 'vitest'
import { isEmail, mergeRecipients, tareaEntregada } from './classroom'

describe('recipient merge', () => {
  it('keeps only emails and dedups case-insensitively across sources', () => {
    const out = mergeRecipients(
      ['mama@x.com', '55-1234-5678', 'PAPA@Y.COM', ''],
      ['papa@y.com', 'tia@z.mx', null, undefined]
    )
    expect(out).toEqual(['mama@x.com', 'PAPA@Y.COM', 'tia@z.mx'])
  })

  it('rejects phones and malformed addresses', () => {
    expect(isEmail('5512345678')).toBe(false)
    expect(isEmail('a@b')).toBe(false)
    expect(isEmail('mama@escuela.mx')).toBe(true)
  })
})

describe('tareaEntregada', () => {
  const plays = [
    { material_id: 'm1', passed: true },
    { material_id: 'm2', passed: false },
    { material_id: 'm3', passed: null }, // free play, no threshold
  ]
  it('entregado when a run passed or had no threshold', () => {
    expect(tareaEntregada('m1', plays)).toBe(true)
    expect(tareaEntregada('m3', plays)).toBe(true)
  })
  it('pendiente when every run failed the threshold, or never played', () => {
    expect(tareaEntregada('m2', plays)).toBe(false)
    expect(tareaEntregada('m9', plays)).toBe(false)
    expect(tareaEntregada(null, plays)).toBe(false)
  })
})
