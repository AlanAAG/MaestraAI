import { describe, it, expect } from 'vitest'
import {
  bulletizeMomentos,
  stripMomentoEcho,
  expandStrategyAcronym,
  ESTRATEGIA_COMUNITARIA_FULL,
  normalizePlanDocument,
} from './normalize-document'

describe('expandStrategyAcronym', () => {
  it('expands the dotted, undotted and spaced variants', () => {
    for (const v of ['E.C.P.C.E.E.L.Y', 'ECPCEELY', 'E.C.P.C.E.E.L.V', 'E. C. P. C. E. E. L. Y'])
      expect(expandStrategyAcronym(v)).toBe(ESTRATEGIA_COMUNITARIA_FULL)
  })

  it('leaves other text alone', () => {
    expect(expandStrategyAcronym('Pausa activa')).toBe('Pausa activa')
    expect(expandStrategyAcronym('')).toBe('')
  })

  it('expands inside cronograma cells at save time', () => {
    const out = normalizePlanDocument({ cronograma: { lunes: ['honores', 'E.C.P.C.E.E.L.Y'] } })
    expect(out.cronograma.lunes).toEqual(['honores', ESTRATEGIA_COMUNITARIA_FULL])
  })
})

describe('bulletizeMomentos', () => {
  it('bullets every idea line but leaves headings, bullets and numbers alone', () => {
    const src = [
      '**Punto de Partida**',
      'Iniciaré preguntando a los niños cómo se sienten.',
      'Presentaré materiales diversos.',
      '',
      '- Ya es viñeta',
      '1. Paso numerado',
      '## Subtítulo',
    ].join('\n')
    expect(bulletizeMomentos(src).split('\n')).toEqual([
      '**Punto de Partida**',
      '', // blank line after the heading
      '- Iniciaré preguntando a los niños cómo se sienten.',
      '- Presentaré materiales diversos.',
      '',
      '- Ya es viñeta',
      '1. Paso numerado',
      '', // blank line inserted before every heading
      '## Subtítulo',
    ])
  })

  it('is idempotent and runs on proyecto at save time', () => {
    const out = normalizePlanDocument({ proyecto: '**Momento**\nUna idea.' })
    expect(out.proyecto).toBe('**Momento**\n\n- Una idea.')
    expect(normalizePlanDocument(out).proyecto).toBe(out.proyecto)
  })
})

describe('stripMomentoEcho', () => {
  it('drops the label the model repeats inside the momento text', () => {
    expect(
      stripMomentoEcho('1° Momento: En contacto con la realidad. Inicio la sesión sentando a…')
    ).toBe('Inicio la sesión sentando a…')
    expect(stripMomentoEcho('Inicio la sesión.')).toBe('Inicio la sesión.')
  })

  it('applies to sub-plan momentos at save time, before bulleting', () => {
    const pd = normalizePlanDocument({
      sub_planes: [
        { tipo: 'numeros', estructura_didactica: { momento_1: '2° Momento: Expresión. Trabajo…' } },
      ],
    })
    expect(pd.sub_planes[0].estructura_didactica.momento_1).toBe('- Trabajo…')
  })
})

describe('momento spacing', () => {
  it('inserts a blank line before each momento heading, idempotently', () => {
    const src = '**Punto de Partida**\nUna idea.\n**A trabajar**\nOtra idea.'
    const once = bulletizeMomentos(src)
    expect(once).toBe('**Punto de Partida**\n\n- Una idea.\n\n**A trabajar**\n\n- Otra idea.')
    expect(bulletizeMomentos(once)).toBe(once)
  })
})
