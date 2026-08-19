import { describe, it, expect } from 'vitest'
import { chunkText, CHUNK_SIZE, CHUNK_OVERLAP } from './attachment-rag'

describe('chunkText', () => {
  it('cuts overlapping chunks on line boundaries', () => {
    const text = Array.from(
      { length: 80 },
      (_, i) => `Línea ${i + 1} de la circular escolar.`
    ).join('\n')
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(CHUNK_SIZE + 10)
    // Overlap: the start of chunk 2 repeats the tail of chunk 1
    expect(chunks[0].slice(-CHUNK_OVERLAP / 2)).toContain('Línea')
  })

  it('returns [] on empty and a single chunk on short text', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('Texto corto.')).toEqual(['Texto corto.'])
  })

  it('caps runaway documents at MAX_CHUNKS', () => {
    const huge = 'palabra '.repeat(50000)
    expect(chunkText(huge).length).toBeLessThanOrEqual(30)
  })
})
