import { describe, it, expect } from 'vitest'
import {
  addCustomSection,
  removeCustomSection,
  findCustomSection,
  listCustomSections,
} from './custom-sections'

const doc = () => ({
  proyecto: 'texto',
  custom_sections: [
    { title: 'Salidas', content: 'a' },
    { title: 'Música', content: 'b' },
    { title: 'Huerto', content: 'c' },
  ],
  _section_order: ['proyecto', 'custom:0', 'cronograma', 'custom:1', 'custom:2'],
})

describe('addCustomSection', () => {
  it('appends the section and registers it in the render order', () => {
    const out = addCustomSection(doc(), { title: 'Nuevo', content: 'x' })
    expect(out.custom_sections).toHaveLength(4)
    // Without the order entry the section would never render.
    expect(out._section_order).toContain('custom:3')
  })

  it('does not invent a _section_order when the document has none', () => {
    // An absent order means "use the default"; a partial list here would drop
    // every standard section from the render.
    const out = addCustomSection({ proyecto: 'x' }, { title: 'N', content: 'y' })
    expect(out._section_order).toBeUndefined()
    expect(out.custom_sections).toHaveLength(1)
  })
})

describe('removeCustomSection', () => {
  it('removes the section and drops its order entry', () => {
    const out = removeCustomSection(doc(), 1)
    expect(listCustomSections(out)).toEqual(['Salidas', 'Huerto'])
    expect(out._section_order).not.toContain('custom:2')
  })

  it('re-indexes later sections so they still point at the right content', () => {
    // 'Huerto' was custom:2; after removing index 1 it must become custom:1.
    const out = removeCustomSection(doc(), 1)
    expect(out._section_order).toEqual(['proyecto', 'custom:0', 'cronograma', 'custom:1'])
    expect((out.custom_sections as { title: string }[])[1].title).toBe('Huerto')
  })

  it('leaves earlier indices alone', () => {
    const out = removeCustomSection(doc(), 2)
    expect(out._section_order).toEqual(['proyecto', 'custom:0', 'cronograma', 'custom:1'])
    expect(listCustomSections(out)).toEqual(['Salidas', 'Música'])
  })

  it('is a no-op for an out-of-range index rather than corrupting the plan', () => {
    expect(removeCustomSection(doc(), 9)).toEqual(doc())
    expect(removeCustomSection(doc(), -1)).toEqual(doc())
  })

  it('survives a document with no custom sections', () => {
    expect(removeCustomSection({ proyecto: 'x' }, 0)).toEqual({ proyecto: 'x' })
  })

  it('round-trips: add then remove restores the original order', () => {
    const start = doc()
    const added = addCustomSection(start, { title: 'Temp', content: 'z' })
    const back = removeCustomSection(added, 3)
    expect(back._section_order).toEqual(start._section_order)
    expect(listCustomSections(back)).toEqual(listCustomSections(start))
  })
})

describe('findCustomSection', () => {
  it('matches ignoring case and accents', () => {
    expect(findCustomSection(doc(), 'música')).toBe(1)
    expect(findCustomSection(doc(), 'MUSICA')).toBe(1)
    expect(findCustomSection(doc(), '  Huerto ')).toBe(2)
  })

  it('returns -1 when there is no match', () => {
    expect(findCustomSection(doc(), 'Inexistente')).toBe(-1)
  })
})
