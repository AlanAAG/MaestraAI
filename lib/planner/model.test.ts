import { describe, it, expect } from 'vitest'
import { parsePlanJson } from './model'

describe('parsePlanJson', () => {
  it('parses plain JSON', () => {
    expect(parsePlanJson('{"a":1}')).toEqual({ a: 1 })
  })
  it('strips ```json fences', () => {
    expect(parsePlanJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })
  it('recovers from a stray prefix/suffix via the outermost block', () => {
    expect(parsePlanJson('Aquí tienes:\n{"a":1, "b":[2,3]}\nListo.')).toEqual({ a: 1, b: [2, 3] })
  })
  it('throws on truly invalid output', () => {
    expect(() => parsePlanJson('no json here')).toThrow()
  })
})
