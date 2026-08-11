import { describe, it, expect } from 'vitest'
import { feedbackConflictTarget, FEEDBACK_SECTIONS } from './feedback'

describe('feedbackConflictTarget', () => {
  it('targets the global unique index when no section', () => {
    expect(feedbackConflictTarget(null)).toBe('fortnight_id,teacher_id')
  })
  it('targets the per-section unique index for section comments', () => {
    expect(feedbackConflictTarget('proyecto')).toBe('fortnight_id,teacher_id,section_key')
  })
})

describe('FEEDBACK_SECTIONS', () => {
  it('covers the narrative sections and never structured ones', () => {
    expect(FEEDBACK_SECTIONS.has('proyecto')).toBe(true)
    expect(FEEDBACK_SECTIONS.has('ajustes_razonables')).toBe(true)
    expect(FEEDBACK_SECTIONS.has('custom_sections')).toBe(false)
    expect(FEEDBACK_SECTIONS.has('cronograma')).toBe(false)
  })
})
