import { describe, it, expect } from 'vitest'
import { sectionToString, normalizePlanDocument } from './normalize-document'

describe('sectionToString', () => {
  it('passes strings through', () => {
    expect(sectionToString('hola')).toBe('hola')
  })
  it('joins string arrays with paragraph breaks', () => {
    expect(sectionToString(['Clima: x', 'Saludo: y'])).toBe('Clima: x\n\nSaludo: y')
  })
  it('extracts text from object-item arrays', () => {
    expect(sectionToString([{ texto: 'a' }, { text: 'b' }, { contenido: 'c' }])).toBe('a\n\nb\n\nc')
  })
  it('renders labeled objects as Label: value', () => {
    expect(sectionToString({ inicio: 'a', cierre: 'b' })).toBe('inicio: a\n\ncierre: b')
  })
  it('returns empty string for null/undefined', () => {
    expect(sectionToString(null)).toBe('')
    expect(sectionToString(undefined)).toBe('')
  })
})

describe('normalizePlanDocument', () => {
  it('coerces array section fields to strings', () => {
    const pd = normalizePlanDocument({
      tipo: 'quincena',
      actividades_iniciales: ['Clima: x', 'Saludo: y'],
      actividades_rutina: 'ya es texto',
    })
    expect(pd.actividades_iniciales).toBe('Clima: x\n\nSaludo: y')
    expect(pd.actividades_rutina).toBe('ya es texto')
  })
  it('normalizes custom_sections content + drops empties', () => {
    const pd = normalizePlanDocument({
      custom_sections: [
        { title: 'A', content: ['uno', 'dos'] },
        { title: '', content: '' },
      ],
    })
    expect(pd.custom_sections).toEqual([{ title: 'A', content: 'uno\n\ndos' }])
  })
  it('normalizes sub_planes estructura_didactica + observaciones', () => {
    const pd = normalizePlanDocument({
      sub_planes: [
        { tipo: 'numeros', estructura_didactica: { momento_1: ['a', 'b'] }, observaciones: ['c'] },
      ],
    })
    expect(pd.sub_planes[0].estructura_didactica.momento_1).toBe('a\n\nb')
    expect(pd.sub_planes[0].observaciones).toBe('c')
  })
  it('leaves structured arrays untouched', () => {
    const campos = [{ campo: 'Lenguajes', contenidos: [{ contenido: 'x', procesos: ['p'] }] }]
    const pd = normalizePlanDocument({ campos_formativos: campos })
    expect(pd.campos_formativos).toEqual(campos)
  })
  it('is idempotent', () => {
    const once = normalizePlanDocument({ proyecto: ['a', 'b'] })
    const twice = normalizePlanDocument(once)
    expect(twice.proyecto).toBe('a\n\nb')
  })
})
