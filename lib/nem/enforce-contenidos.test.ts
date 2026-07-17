import { describe, it, expect } from 'vitest'
import { matchContenido, enforceCamposFormativos } from './enforce-contenidos'
import { CONTENIDOS_FASE2_3 } from './contenidos-fase2'

const OFFICIAL_NARRACION = CONTENIDOS_FASE2_3.find((c) =>
  c.contenido.startsWith('Narración de historias')
)!

describe('matchContenido', () => {
  it('matches exact official text', () => {
    const row = matchContenido(OFFICIAL_NARRACION.contenido)
    expect(row?.contenido).toBe(OFFICIAL_NARRACION.contenido)
  })

  it('matches despite accent/case variance', () => {
    const row = matchContenido('NARRACION DE HISTORIAS mediante diversos lenguajes')
    expect(row?.contenido).toBe(OFFICIAL_NARRACION.contenido)
  })

  it('snaps the school-transcription variance to the official ending', () => {
    // School table ends "...a través de diversas formas de expresión"; official ends "...diferentes textos".
    const row = matchContenido(
      'Narración de historias mediante diversos lenguajes, en un ambiente donde niñas y niños participen y se apropien de la cultura, a través de diversas formas de expresión.'
    )
    expect(row?.contenido).toBe(OFFICIAL_NARRACION.contenido)
  })

  it('matches a PRONI contenido', () => {
    const row = matchContenido('Textos orales y escritos en lengua inglesa')
    expect(row?.campo).toBe('Lenguajes')
    expect(row?.pdas3.length).toBeGreaterThan(0)
  })

  it('rejects invented contenidos', () => {
    expect(matchContenido('Desarrollo de habilidades espaciales con drones educativos')).toBeNull()
    expect(matchContenido('')).toBeNull()
  })
})

describe('enforceCamposFormativos', () => {
  it('replaces procesos with the FULL official PDA desglose and corrects the campo', () => {
    const out = enforceCamposFormativos([
      {
        campo: 'Saberes y Pensamiento Científico', // misfiled — Narración is Lenguajes
        contenidos: [
          { contenido: OFFICIAL_NARRACION.contenido, procesos: ['PDA inventado resumido'] },
        ],
      },
    ]) as { campo: string; contenidos: { contenido: string; procesos: string[] }[] }[]
    expect(out).toHaveLength(1)
    expect(out[0].campo).toBe('Lenguajes')
    expect(out[0].contenidos[0].procesos).toEqual(OFFICIAL_NARRACION.pdas3)
  })

  it('drops unmatched contenidos and dedupes', () => {
    const out = enforceCamposFormativos([
      {
        campo: 'Lenguajes',
        contenidos: [
          { contenido: OFFICIAL_NARRACION.contenido, procesos: [] },
          { contenido: OFFICIAL_NARRACION.contenido.toUpperCase(), procesos: [] }, // dup
          { contenido: 'Contenido totalmente inventado sobre robots espaciales', procesos: [] },
        ],
      },
    ]) as { campo: string; contenidos: unknown[] }[]
    expect(out).toHaveLength(1)
    expect(out[0].contenidos).toHaveLength(1)
  })

  it('orders campos canonically (Lenguajes first) regardless of model output order', () => {
    const saberes = CONTENIDOS_FASE2_3.find((c) => c.campo === 'Saberes y Pensamiento Científico')!
    const out = enforceCamposFormativos([
      { campo: saberes.campo, contenidos: [{ contenido: saberes.contenido, procesos: [] }] },
      {
        campo: 'Lenguajes',
        contenidos: [{ contenido: OFFICIAL_NARRACION.contenido, procesos: [] }],
      },
    ]) as { campo: string }[]
    expect(out.map((c) => c.campo)).toEqual(['Lenguajes', 'Saberes y Pensamiento Científico'])
  })

  it('returns input unchanged when malformed or nothing matches', () => {
    expect(enforceCamposFormativos('not an array')).toBe('not an array')
    expect(enforceCamposFormativos(undefined)).toBeUndefined()
    const nothingMatches = [
      { campo: 'X', contenidos: [{ contenido: 'puro invento sin relación alguna', procesos: [] }] },
    ]
    expect(enforceCamposFormativos(nothingMatches)).toBe(nothingMatches)
  })
})
