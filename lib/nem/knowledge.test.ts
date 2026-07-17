import { describe, it, expect } from 'vitest'
import { nemKnowledgeBlock, type NemKnowledgeChunk } from './knowledge'

const chunk = (over: Partial<NemKnowledgeChunk> = {}): NemKnowledgeChunk => ({
  id: 'x',
  source: 'Evaluacion-Formativa-Fase2.md',
  heading_path: 'Fichero > Ficha 3. Elementos indispensables',
  content: 'La evaluación formativa requiere observación sistemática.',
  similarity: 0.85,
  ...over,
})

describe('nemKnowledgeBlock', () => {
  it('returns empty string for no chunks', () => {
    expect(nemKnowledgeBlock([])).toBe('')
  })

  it('formats chunks with source label + heading_path and wraps in <conocimiento_nem>', () => {
    const block = nemKnowledgeBlock([chunk()])
    expect(block).toContain('<conocimiento_nem>')
    expect(block).toContain('</conocimiento_nem>')
    expect(block).toContain(
      'Según [Evaluación Formativa Fase 2 (SEP), "Fichero > Ficha 3. Elementos indispensables"]:'
    )
    expect(block).toContain('observación sistemática')
    expect(block).toContain('NUNCA los contradigas')
  })

  it('falls back to the raw source when unlabeled, omits missing heading_path', () => {
    const block = nemKnowledgeBlock([
      chunk({ source: 'otro.md', heading_path: null, content: 'Texto.' }),
    ])
    expect(block).toContain('Según [otro.md]:')
    expect(block).not.toContain('""')
  })

  it('caps the total block at ~6k chars by dropping trailing chunks', () => {
    const big = chunk({ content: 'x'.repeat(2500) })
    const block = nemKnowledgeBlock([big, big, big, big, big])
    expect(block.length).toBeLessThan(6500)
    // Two 2.5k chunks fit under 6k; the third does not.
    expect(block.split('Según [').length - 1).toBe(2)
  })
})
