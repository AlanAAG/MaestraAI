import { beforeEach, expect, it, vi } from 'vitest'
import { extractTemplate } from './extract-template'

const mocks = vi.hoisted(() => ({ create: vi.fn(), text: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mocks.create }
  },
}))
vi.mock('mammoth', () => ({ default: { extractRawText: mocks.text } }))
vi.mock('./docx-style', () => ({ readDocxStyle: async () => ({ page_orientation: 'horizontal' }) }))
const docx = {
  documentBase64: 'YQ==',
  documentMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
const pdf = { documentBase64: 'YQ==', documentMimeType: 'application/pdf' }
const response = (profile: object, stop_reason = 'end_turn') => ({
  content: [{ type: 'text', text: JSON.stringify(profile).slice(1) }],
  stop_reason,
})
beforeEach(() => vi.clearAllMocks())

it('extracts from the entire DOCX and retains its final instructions and detected layout', async () => {
  const source =
    'Actividades Iniciales\n' +
    'La actividad del día. '.repeat(1500) +
    '\nINSTRUCCIÓN FINAL OBLIGATORIA'
  mocks.text.mockResolvedValueOnce({ value: source })
  mocks.create.mockResolvedValueOnce(response({ sections: ['Actividades Iniciales'] }))
  const profile = await extractTemplate(docx)
  expect(mocks.create.mock.calls[0][0].messages[0].content).toContain(
    'INSTRUCCIÓN FINAL OBLIGATORIA'
  )
  expect(profile.raw_text).toContain('INSTRUCCIÓN FINAL OBLIGATORIA')
  expect(profile.formatting_rules?.page_orientation).toBe('horizontal')
})
it('preserves the complete visual transcription for PDF references', async () => {
  const raw_text = 'Actividades Iniciales\n' + 'Cada día cantaremos con todo el grupo. '.repeat(5)
  mocks.create.mockResolvedValueOnce(response({ sections: ['Actividades Iniciales'], raw_text }))
  expect((await extractTemplate(pdf)).raw_text).toBe(raw_text)
})
it('rejects truncated model output even when it happens to contain valid JSON', async () => {
  mocks.create.mockResolvedValueOnce(response({ sections: ['Proyecto'] }, 'max_tokens'))
  await expect(extractTemplate(pdf)).rejects.toThrow('incompleta')
})
it('does not accept a visual format with only fragments and no full transcription', async () => {
  mocks.create.mockResolvedValueOnce(
    response({ sections: ['Proyecto'], writing_style_samples: ['fragmento'] })
  )
  await expect(extractTemplate(pdf)).rejects.toThrow('texto del ejemplo completo')
})
