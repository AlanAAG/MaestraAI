import { describe, expect, it } from 'vitest'
import { summarizeByTeacher } from './oversight'

describe('summarizeByTeacher', () => {
  it('groups rows from all three sources by teacher', () => {
    const out = summarizeByTeacher(
      [{ teacher_id: 'a' }, { teacher_id: 'b' }],
      [{ teacher_id: 'a' }, { teacher_id: 'a' }],
      [{ teacher_id: 'b' }]
    )
    const a = out.find((s) => s.teacherId === 'a')!
    const b = out.find((s) => s.teacherId === 'b')!
    expect(a.planes).toHaveLength(1)
    expect(a.materiales).toHaveLength(2)
    expect(a.posts).toHaveLength(0)
    expect(b.planes).toHaveLength(1)
    expect(b.posts).toHaveLength(1)
  })

  it('returns empty for no rows', () => {
    expect(summarizeByTeacher([], [], [])).toEqual([])
  })
})
