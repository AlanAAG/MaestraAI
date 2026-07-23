import { describe, it, expect } from 'vitest'
import { CONTENIDOS_FASE2_3 } from './contenidos-fase2'
import {
  buildContenidoMenu,
  mapSelection,
  contenidosSugeridosBlock,
  contenidosFromTitles,
} from './select-contenidos'

describe('select-contenidos', () => {
  it('menu is index-stable with the bank', () => {
    const lines = buildContenidoMenu().split('\n')
    expect(lines).toHaveLength(CONTENIDOS_FASE2_3.length)
    expect(lines[0].startsWith('0. ')).toBe(true)
  })

  it('mapSelection drops out-of-range, non-integer and duplicate indices', () => {
    const picked = mapSelection([0, 0, 999, -1, 1.5, '2'])
    // 0 once, 2 (coerced from "2"); 999/-1/1.5 dropped
    expect(picked).toHaveLength(2)
    expect(picked[0]).toBe(CONTENIDOS_FASE2_3[0])
    expect(picked[1]).toBe(CONTENIDOS_FASE2_3[2])
  })

  it('mapSelection returns [] for non-array input', () => {
    expect(mapSelection(null)).toEqual([])
    expect(mapSelection(undefined)).toEqual([])
  })

  it('contenidosFromTitles maps verbatim, dedups, drops unknown, preserves order', () => {
    const a = CONTENIDOS_FASE2_3[0].contenido
    const b = CONTENIDOS_FASE2_3[2].contenido
    const picked = contenidosFromTitles([b, a, a, 'no existe'])
    expect(picked).toHaveLength(2)
    expect(picked[0]).toBe(CONTENIDOS_FASE2_3[2]) // order preserved (b first)
    expect(picked[1]).toBe(CONTENIDOS_FASE2_3[0])
    expect(contenidosFromTitles([])).toEqual([])
  })

  it('block is empty for [] and groups by campo + copies PDAs verbatim', () => {
    expect(contenidosSugeridosBlock([])).toBe('')
    const block = contenidosSugeridosBlock([CONTENIDOS_FASE2_3[0]])
    expect(block).toContain('<contenidos_sugeridos>')
    expect(block).toContain(`CAMPO: ${CONTENIDOS_FASE2_3[0].campo}`)
    expect(block).toContain(CONTENIDOS_FASE2_3[0].pdas3[0])
  })
})
