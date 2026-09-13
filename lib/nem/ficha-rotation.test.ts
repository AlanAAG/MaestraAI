import { describe, it, expect } from 'vitest'
import { FICHAS_PAZ } from './fichero-paz'
import { extractUsedFichas, pickFicha, pickFichas, buildFichaBlock } from './ficha-rotation'

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

describe('pickFichas', () => {
  it('gives one distinct ficha per week', () => {
    const picked = pickFichas([], 2)
    expect(picked).toHaveLength(2)
    expect(picked[0].numero).not.toBe(picked[1].numero)
  })

  it('continues after the fichas already used in past plans', () => {
    // The whole point of the teacher's report: the plan after the first must start on ficha 2.
    const week1 = pickFichas([], 2)
    const week2 = pickFichas(
      week1.map((f) => f.numero),
      2
    )
    const all = [...week1, ...week2].map((f) => f.numero)
    expect(new Set(all).size).toBe(4)
    expect(all).toEqual(FICHAS_PAZ.slice(0, 4).map((f) => f.numero))
  })

  it('never returns an empty list', () => {
    expect(pickFichas([], 0)).toHaveLength(1)
  })
})

describe('buildFichaBlock', () => {
  it('includes number, name, and text', () => {
    const b = buildFichaBlock(FICHAS_PAZ[0])
    expect(b).toContain('<ficha_de_la_paz>')
    expect(b).toContain(`Ficha número ${FICHAS_PAZ[0].numero}`)
    expect(b).toContain(FICHAS_PAZ[0].nombre)
  })

  it('labels each week and demands a different activity per week', () => {
    const b = buildFichaBlock(FICHAS_PAZ.slice(0, 2))
    expect(b).toContain('SEMANA 1 —')
    expect(b).toContain('SEMANA 2 —')
    expect(b).toMatch(/CAMBIA cada semana/)
    expect(b).toContain(`Ficha número ${FICHAS_PAZ[1].numero}`)
  })

  it('drops the weekly wording for a single ficha', () => {
    const b = buildFichaBlock([FICHAS_PAZ[0]])
    expect(b).not.toContain('SEMANA 1')
  })

  // A quincena's two fichas must both be recoverable from the text the model writes,
  // or the next plan would hand back a ficha this one already used.
  it('round-trips through extractUsedFichas', () => {
    const picked = pickFichas([], 2)
    const asWritten = picked.map((f) => `Ficha número ${f.numero}: ${f.nombre}`).join(' ')
    expect(extractUsedFichas([asWritten])).toEqual(picked.map((f) => f.numero))
  })
})
