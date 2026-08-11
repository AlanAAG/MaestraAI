import { describe, it, expect } from 'vitest'
import { feedbackConflictTarget, FEEDBACK_SECTIONS, GLOBAL_SECTION } from './feedback'

describe('feedbackConflictTarget', () => {
  it('targets the plain unique index when no section', () => {
    expect(feedbackConflictTarget(null)).toBe('fortnight_id,teacher_id,section_key')
  })
  it('targets the plain unique index for section comments', () => {
    expect(feedbackConflictTarget('proyecto')).toBe('fortnight_id,teacher_id,section_key')
  })
})

describe('GLOBAL_SECTION', () => {
  it('is the sentinel value for whole-document feedback', () => {
    expect(GLOBAL_SECTION).toBe('')
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
