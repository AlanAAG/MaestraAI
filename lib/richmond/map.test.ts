import { describe, it, expect } from 'vitest'
import { mapAssignment, mapStudent, asNumOrNull } from './map'

describe('richmond map', () => {
  it('maps the real Richmond assignment_scores shape we observed', () => {
    const raw = {
      id: '8c8b725c-2d82-4b7d-a46d-7baa361810fb',
      title: 'LISTEN, SING AND COMPLETE',
      instructions: 'Hola mamita...',
      students: [
        {
          richmond_student_id: 'stu-1',
          first_name: 'Ana',
          last_name: 'Lopez',
          total_score: 9,
          done: true,
        },
      ],
    }
    const m = mapAssignment(raw)
    expect(m.id).toBe('8c8b725c-2d82-4b7d-a46d-7baa361810fb')
    expect(m.title).toBe('LISTEN, SING AND COMPLETE')
    expect(m.students[0]).toMatchObject({ rid: 'stu-1', first: 'Ana', score: 9, done: true })
  })

  it('falls back across alternate field names without throwing', () => {
    // Student id under `id`, name under `name`, score under `score`, submitted under `submitted`
    const s = mapStudent({ id: 42, name: 'Bruno', score: '7', submitted: true })
    expect(s.rid).toBe('42') // coerced to string
    expect(s.first).toBe('Bruno')
    expect(s.score).toBe(7) // coerced to number
    expect(s.done).toBe(true)
  })

  it('handles students nested under `scores` key', () => {
    const m = mapAssignment({ name: 'Tarea', scores: [{ student_id: 'x', grade: 5 }] })
    expect(m.title).toBe('Tarea') // title from `name`
    expect(m.students).toHaveLength(1)
    expect(m.students[0]).toMatchObject({ rid: 'x', score: 5 })
  })

  it('produces safe defaults for an empty/garbage object (never throws)', () => {
    const m = mapAssignment({})
    expect(m.title).toBe('Actividad')
    expect(m.students).toEqual([])
    expect(m.total_students).toBe(0)
    expect(m.class_avg_score).toBeNull()
  })

  it('asNumOrNull rejects non-numeric values rather than producing NaN', () => {
    expect(asNumOrNull('abc')).toBeNull()
    expect(asNumOrNull('')).toBeNull()
    expect(asNumOrNull(null)).toBeNull()
    expect(asNumOrNull('8.5')).toBe(8.5)
    expect(asNumOrNull(0)).toBe(0) // zero is a valid score, not null
  })

  it('leaves rid empty when no id field exists (caller must skip to avoid collisions)', () => {
    const s = mapStudent({ first_name: 'NoId' })
    expect(s.rid).toBe('')
  })
})
