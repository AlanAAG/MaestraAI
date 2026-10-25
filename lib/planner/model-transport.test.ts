import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callPlannerJson, callPlannerModel, parsePlanJson } from './model'

const create = vi.hoisted(() => vi.fn())
vi.mock('@/lib/ai/openai-provider', () => ({
  default: class {
    messages = { create }
  },
  shouldTryAnotherModel: (error: { status?: number }) =>
    ![400, 401, 403, 429].includes(error.status ?? 0),
}))
const reply = (text: string, stop_reason = 'end_turn') => ({
  content: [{ type: 'text', text }],
  stop_reason,
  usage: { input_tokens: 20, output_tokens: 20 },
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('OPENAI_API_KEY', 'test-key')
})
afterEach(() => vi.unstubAllEnvs())

describe('planner OpenAI model recovery', () => {
  it('retries an incomplete Luna response with Sol', async () => {
    create
      .mockResolvedValueOnce(reply('{"proyecto":"parcial"}', 'max_tokens'))
      .mockResolvedValueOnce(reply('{"proyecto":"completo"}'))
    expect(await callPlannerJson('JSON', 'plan')).toEqual({ proyecto: 'completo' })
    expect(create.mock.calls.map((call) => call[0].model)).toEqual(['gpt-6-luna', 'gpt-6.1-sol'])
  })

  it('retries invalid Luna JSON and rejects an incomplete Sol response', async () => {
    create
      .mockResolvedValueOnce(reply('{"proyecto":'))
      .mockResolvedValueOnce(reply('{"proyecto":"parcial"}', 'max_tokens'))
    await expect(callPlannerJson('JSON', 'plan')).rejects.toThrow('incompleta')
  })

  it('accepts plain text for section rewriting', async () => {
    create.mockResolvedValueOnce(reply('Clima: observaremos el cielo.'))
    expect(await callPlannerModel('Solo texto', 'Completa la sección')).toBe(
      'Clima: observaremos el cielo.'
    )
    expect(create.mock.calls[0][0]).toMatchObject({
      model: 'gpt-6-luna',
      system: 'Solo texto',
      messages: [{ role: 'user', content: 'Completa la sección' }],
    })
  })

  it('reports a provider outage when both model tiers fail', async () => {
    create
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockRejectedValueOnce(new Error('timeout'))
    await expect(callPlannerJson('JSON', 'plan')).rejects.toThrow(
      'servicio de IA no está disponible'
    )
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('does not pay for a second model attempt after an authentication failure', async () => {
    create.mockRejectedValueOnce(Object.assign(new Error('bad key'), { status: 401 }))
    await expect(callPlannerModel('text', 'plan')).rejects.toThrow(
      'servicio de IA no está disponible'
    )
    expect(create).toHaveBeenCalledOnce()
  })

  it('collects all text blocks in a completed response', async () => {
    create.mockResolvedValueOnce({
      ...reply('Inicio'),
      content: [
        { type: 'text', text: 'Inicio' },
        { type: 'text', text: 'Cierre' },
      ],
    })
    expect(await callPlannerModel('text', 'plan')).toBe('Inicio\nCierre')
  })

  it('does not call a model after the generation deadline', async () => {
    const controller = new AbortController()
    controller.abort(new Error('deadline'))
    await expect(callPlannerJson('JSON', 'plan', { signal: controller.signal })).rejects.toThrow(
      'deadline'
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('requires a configured OpenAI key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(callPlannerModel('text', 'plan')).rejects.toThrow(
      'servicio de IA no está disponible'
    )
  })

  it('rejects null and arrays instead of treating them as a plan', () => {
    for (const text of ['null', '[]', '"un plan"', '{"a":{"b":1},"c":'])
      expect(() => parsePlanJson(text)).toThrow()
  })
})
