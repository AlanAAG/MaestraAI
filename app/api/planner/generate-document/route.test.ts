import { expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const mocks = vi.hoisted(() => ({
  selectContents: vi.fn(),
  generate: vi.fn(),
  save: vi.fn(),
  templateTypes: [] as string[],
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true }) }))
vi.mock('@/lib/nem/select-contenidos', async (original) => ({
  ...(await original<typeof import('@/lib/nem/select-contenidos')>()),
  selectRelevantContenidos: mocks.selectContents,
}))
vi.mock('@/lib/planner/generate-parts', () => ({ generateMainDocument: mocks.generate }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
    rpc: mocks.save,
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          if (table === 'teacher_plan_templates' && key === 'plan_type')
            mocks.templateTypes.push(value)
          return query
        },
        neq: () => query,
        not: () => query,
        lt: () => query,
        order: () => query,
        limit: () => query,
        in: () => query,
        then: (resolve: (value: unknown) => void) => resolve({ data: [] }),
        single: async () => ({
          data:
            table === 'teachers'
              ? { id: 'teacher' }
              : {
                  id: 'plan',
                  teacher_id: 'teacher',
                  group_id: 'group',
                  plan_type: 'mes',
                  project_name: 'Historias',
                  use_system_template: true,
                  start_date: '2026-10-01',
                  end_date: '2026-10-30',
                  groups: { grade: 'Kinder 2' },
                  unidades_didacticas: [{ metodologia: 'Proyecto', ejes: ['Inclusión'] }],
                },
        }),
      }
      return query
    },
  }),
}))

it('streams preparation before curriculum selection completes and reports selection failure without saving', async () => {
  let rejectSelection!: (reason: Error) => void
  mocks.selectContents.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectSelection = reject
      })
  )
  const response = await POST(
    new NextRequest('http://localhost/api/planner/generate-document', {
      method: 'POST',
      body: JSON.stringify({ fortnight_id: '11111111-1111-4111-8111-111111111111' }),
    })
  )
  expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  const reader = response.body!.getReader()
  const first = await reader.read()
  expect(new TextDecoder().decode(first.value)).toContain('preparing')
  await vi.waitFor(() => expect(mocks.selectContents).toHaveBeenCalled())
  rejectSelection(new Error('No se pudieron seleccionar contenidos oficiales'))
  let text = ''
  for (;;) {
    const next = await reader.read()
    if (next.done) break
    text += new TextDecoder().decode(next.value)
  }
  expect(text).toContain('No se pudieron seleccionar contenidos oficiales')
  expect(text).not.toContain('[DONE]')
  expect(mocks.generate).not.toHaveBeenCalled()
  expect(mocks.save).not.toHaveBeenCalled()
  expect(mocks.templateTypes).toEqual(['quincena'])
})
