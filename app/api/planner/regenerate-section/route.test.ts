import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const mocks = vi.hoisted(() => ({
  model: vi.fn(),
  reads: [] as Array<Record<string, unknown>>,
  writes: [] as Array<{ plan_document: Record<string, unknown> }>,
  filters: [] as Array<[string, unknown]>,
  conflict: false,
  save: vi.fn(),
}))

vi.mock('@/lib/planner/model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/planner/model')>()),
  callPlannerModel: mocks.model,
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true }) }))
vi.mock('@/lib/planner/learning', () => ({ getLearnedProfile: async () => null }))
vi.mock('@/lib/planner/template-context', () => ({
  loadPlanTemplate: async () => null,
  templateContext: () => '',
}))
vi.mock('@/lib/planner/embeddings', () => ({
  storePlaneacionEmbedding: async () => {},
  planEmbeddingText: () => '',
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
    rpc: mocks.save,
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          mocks.filters.push([key, value])
          return query
        },
        update: (value: { plan_document: Record<string, unknown> }) => {
          mocks.writes.push(value)
          return query
        },
        single: async () => ({
          data: table === 'teachers' ? { id: 'teacher' } : mocks.reads.shift(),
          error: null,
        }),
        maybeSingle: async () => ({ data: mocks.conflict ? null : { id: 'plan' }, error: null }),
        upsert: async () => ({ error: null }),
        insert: async () => ({ error: null }),
      }
      return query
    },
  }),
}))

const completeText =
  'Clima: Junto con los niños, observaremos cómo está el clima cada día y comentaremos si es soleado, nublado o lluvioso.'
const baseDoc = {
  tipo: 'taller',
  desarrollo_taller: '**Inicio**\n- ' + completeText,
  ajustes_razonables: completeText,
}
const request = () =>
  new NextRequest('http://localhost/api/planner/regenerate-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fortnight_id: '11111111-1111-4111-8111-111111111111',
      section_key: 'actividades_iniciales',
      comment: 'Completa las actividades iniciales siguiendo el formato.',
      mode: 'complete',
    }),
  })
function initial(doc: Record<string, unknown>) {
  return {
    id: 'plan',
    teacher_id: 'teacher',
    plan_type: 'taller',
    project_name: 'Día de Muertos',
    plan_document: doc,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.reads = []
  mocks.writes = []
  mocks.filters = []
  mocks.conflict = false
  mocks.model.mockResolvedValue(completeText)
  mocks.save.mockImplementation(async (_name, args) => {
    mocks.writes.push({ plan_document: args.new_document })
    return { data: !mocks.conflict, error: null }
  })
})

describe('complete a missing plan section', () => {
  it('generates an absent section, clears its warning, and keeps edits made to another section during generation', async () => {
    const latest = {
      ...baseDoc,
      ajustes_razonables: completeText + ' Cambio manual de la maestra.',
    }
    mocks.reads.push(initial(baseDoc), { plan_document: latest })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(mocks.model.mock.calls[0][1]).toContain('Sección pendiente')
    expect(mocks.writes[0].plan_document.actividades_iniciales).toBe(completeText)
    expect(mocks.writes[0].plan_document.ajustes_razonables).toBe(latest.ajustes_razonables)
    expect(mocks.writes[0].plan_document._format_issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ section: 'actividades_iniciales' })])
    )
    expect(mocks.save).toHaveBeenCalledWith(
      'save_plan_document_if_unchanged',
      expect.objectContaining({ expected_document: latest })
    )
    expect(mocks.filters.some(([key]) => key === 'plan_document')).toBe(false)
  })

  it('leaves an already complete section alone even if a stale warning requested repair', async () => {
    mocks.reads.push(initial({ ...baseDoc, actividades_iniciales: { Clima: completeText } }))
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect((await res.json()).unchanged).toBe(true)
    expect(mocks.model).not.toHaveBeenCalled()
    expect(mocks.writes).toHaveLength(0)
  })

  it('preserves a manual edit to the same section made while the model was working', async () => {
    mocks.reads.push(initial(baseDoc), {
      plan_document: { ...baseDoc, actividades_iniciales: 'Mi edición manual' },
    })
    expect((await POST(request())).status).toBe(409)
    expect(mocks.writes).toHaveLength(0)
  })

  it('reports a conflict if the document changes between the final read and write', async () => {
    mocks.reads.push(initial(baseDoc), { plan_document: baseDoc })
    mocks.conflict = true
    expect((await POST(request())).status).toBe(409)
  })

  it('does not save another incomplete model response', async () => {
    mocks.reads.push(initial(baseDoc))
    mocks.model.mockResolvedValue('Clima.')
    expect((await POST(request())).status).toBe(502)
    expect(mocks.writes).toHaveLength(0)
  })

  it('does not repair a plan owned by another teacher', async () => {
    mocks.reads.push({ ...initial(baseDoc), teacher_id: 'someone-else' })
    expect((await POST(request())).status).toBe(404)
    expect(mocks.model).not.toHaveBeenCalled()
  })
})
