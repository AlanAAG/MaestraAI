import { describe, it, expect } from 'vitest'
import { normalizeWorksheetItems } from '@/lib/materials/worksheet-content'

// The page list ColoringBook builds: only coloring activities, item instruction wins over the
// activity's, and word-less items are dropped.
function coloringPages(activities: unknown[]) {
  return (activities as never[])
    .filter((a: never) => (a as { type?: string })?.type === 'coloring')
    .flatMap((a: never) => {
      const act = a as { items?: unknown; teacher_instruction?: string }
      return normalizeWorksheetItems(act.items).map((it) => ({
        word: it.word,
        instruction: it.teacher_instruction ?? act.teacher_instruction,
      }))
    })
    .filter((p) => p.word)
}

describe('coloring pages', () => {
  it('keeps only coloring activities and their items', () => {
    const pages = coloringPages([
      { type: 'circling', items: [{ word: 'dog' }] },
      {
        type: 'coloring',
        teacher_instruction: 'Colorea',
        items: [{ word: 'cat', teacher_instruction: 'el gato es café' }, { word: 'sun' }],
      },
    ])
    expect(pages).toEqual([
      { word: 'cat', instruction: 'el gato es café' },
      { word: 'sun', instruction: 'Colorea' },
    ])
  })

  it('tolerates legacy string items and drops empty words', () => {
    const pages = coloringPages([{ type: 'coloring', items: ['bird', { word: '' }] }])
    expect(pages).toEqual([{ word: 'bird', instruction: undefined }])
  })
})
