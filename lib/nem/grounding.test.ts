import { describe, it, expect } from 'vitest'
import { CONTENIDOS_FASE2_3 } from './contenidos-fase2'
import { nemGroundingBlock, EJES_FASE2 } from './grounding'
import { EJES_ARTICULADORES } from '@/lib/nem-official-data'

describe('NEM grounding', () => {
  it('the ejes dropdown source matches the injected grounding list (no drift)', () => {
    // The form dropdown uses EJES_ARTICULADORES; generation injects EJES_FASE2. Keep them identical.
    expect(EJES_FASE2.map((e) => e.nombre)).toEqual([...EJES_ARTICULADORES])
  })

  it('has all 34 contenidos with at least one 3° PDA each', () => {
    expect(CONTENIDOS_FASE2_3).toHaveLength(34)
    expect(CONTENIDOS_FASE2_3.every((c) => c.pdas3.length > 0)).toBe(true)
  })

  it('injects a verbatim official PDA and omits PRONI unless Kinder 3', () => {
    const block = nemGroundingBlock(false)
    expect(block).toContain('De manera oral, expresa ideas completas sobre necesidades')
    expect(block).not.toContain('<proni_contenidos')
    expect(nemGroundingBlock(true)).toContain('<proni_contenidos')
  })

  it('lists the 6 modalidades oficiales with their fases in order', () => {
    const block = nemGroundingBlock(false)
    expect(block).toContain('<modalidades>')
    expect(block).toContain(
      'Rincones de Aprendizaje: Saberes previos → Asamblea inicial y planeación'
    )
    expect(block).toContain('Unidad Didáctica: Lectura de la realidad')
    // Ordinal prefixes stripped — fases read like the official doc.
    expect(block).toContain(
      'Centro de Interés: En contacto con la realidad → Identificación e integración → Expresión'
    )
    expect(block).toContain('CUALQUIER modalidad')
  })

  it('scopes contenidos by campo', () => {
    const numeros = nemGroundingBlock(false, ['Saberes y Pensamiento Científico'])
    expect(numeros).toContain('CAMPO: Saberes y Pensamiento Científico')
    expect(numeros).not.toContain('CAMPO: Lenguajes')
  })
})
