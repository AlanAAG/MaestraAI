import { describe, it, expect } from 'vitest'
import { FICHAS_PAZ } from './fichero-paz'
import { extractUsedFichas, pickFicha, buildFichaBlock } from './ficha-rotation'

describe('FICHAS_PAZ catalog', () => {
  it('parsed the preescolar fichas', () => {
    expect(FICHAS_PAZ.length).toBeGreaterThanOrEqual(15)
    const f48 = FICHAS_PAZ.find((f) => f.numero === 48)
    expect(f48?.nombre).toBe('Niñas y niños sentimos por igual')
    expect(f48!.texto.length).toBeGreaterThan(500)
  })
})

describe('extractUsedFichas', () => {
  it('finds ficha citations in past texts', () => {
    expect(
      extractUsedFichas([
        'Fichero de la Paz. Ficha número 48 "Niñas y niños sentimos por igual". Con el apoyo...',
        'Ficha 5: Los cinco pasos para la paz',
        null,
        'sin ficha aquí',
      ])
    ).toEqual([48, 5])
  })
})

describe('pickFicha', () => {
  it('picks the first unused ficha', () => {
    const first = FICHAS_PAZ[0]
    expect(pickFicha([]).numero).toBe(first.numero)
    expect(pickFicha([first.numero]).numero).toBe(FICHAS_PAZ[1].numero)
  })
  it('wraps deterministically when all are used', () => {
    const all = FICHAS_PAZ.map((f) => f.numero)
    const picked = pickFicha(all)
    expect(FICHAS_PAZ).toContain(picked)
  })
})

describe('buildFichaBlock', () => {
  it('includes number, name, and text', () => {
    const b = buildFichaBlock(FICHAS_PAZ[0])
    expect(b).toContain('<ficha_de_la_paz>')
    expect(b).toContain(`Ficha número ${FICHAS_PAZ[0].numero}`)
    expect(b).toContain(FICHAS_PAZ[0].nombre)
  })
})
