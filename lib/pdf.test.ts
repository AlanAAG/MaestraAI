import { describe, it, expect } from 'vitest'
import { buildDiaryDocumentProps } from './pdf'

describe('buildDiaryDocumentProps', () => {
  it('formats week label correctly in Spanish', () => {
    const props = buildDiaryDocumentProps({
      teacherName: 'Alejandra Garcia',
      weekStart: '2026-06-02',
      weekEnd: '2026-06-06',
      summaryText: 'Semana productiva.',
    })
    expect(props.teacherName).toBe('Alejandra Garcia')
    expect(props.weekLabel).toContain('junio')
    expect(props.summaryText).toBe('Semana productiva.')
    expect(props.generatedAt).toBeTruthy()
  })

  it('includes all required fields', () => {
    const props = buildDiaryDocumentProps({
      teacherName: 'Test',
      weekStart: '2026-01-05',
      weekEnd: '2026-01-09',
      summaryText: 'Texto.',
    })
    expect(props).toHaveProperty('teacherName')
    expect(props).toHaveProperty('weekLabel')
    expect(props).toHaveProperty('summaryText')
    expect(props).toHaveProperty('generatedAt')
  })
})
