import { describe, it, expect } from 'vitest'
import { planEmbeddingText, styleExamplesBlock } from './embeddings'

describe('planEmbeddingText', () => {
  it('concatenates voice-bearing string fields, ignoring non-strings/empties', () => {
    const text = planEmbeddingText({
      proyecto: 'Hoy exploramos el mar.',
      actividades_rutina: 'Saludo y calendario.',
      cronograma: { lunes: ['x'] }, // non-string → ignored
      ajustes_razonables: '', // empty → ignored
    })
    expect(text).toBe('Hoy exploramos el mar.\n\nSaludo y calendario.')
  })
})

describe('styleExamplesBlock', () => {
  it('is empty when there are no examples', () => {
    expect(styleExamplesBlock([])).toBe('')
  })
  it('wraps examples in the tagged block', () => {
    const block = styleExamplesBlock([
      { project_name: 'El Mar', content: 'Texto de la maestra', similarity: 0.9 },
    ])
    expect(block).toContain('<ejemplos_estilo_maestra>')
    expect(block).toContain('El Mar')
    expect(block).toContain('Texto de la maestra')
  })
})
