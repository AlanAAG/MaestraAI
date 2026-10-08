import { expect, it } from 'vitest'
import { attachmentsBlock } from './attachment-context'

it('keeps rules at the end of every accepted attachment even when retrieval has excerpts', () => {
  const text = 'Texto del reglamento. '.repeat(1400) + '\nREGLA FINAL OBLIGATORIA'
  const context = attachmentsBlock({
    attachment_context: [
      { name: 'Reglamento', text },
      { name: 'Circular', text: 'FECHA: 30 de octubre' },
    ],
  })
  expect(context).toContain('REGLA FINAL OBLIGATORIA')
  expect(context).toContain('FECHA: 30 de octubre')
})
it('rejects an oversized bundle rather than silently ignoring its last documents', () => {
  expect(() =>
    attachmentsBlock({
      attachment_context: Array.from({ length: 11 }, () => ({
        name: 'Archivo',
        text: 'Instrucciones',
      })),
    })
  ).toThrow('10 archivos')
})
