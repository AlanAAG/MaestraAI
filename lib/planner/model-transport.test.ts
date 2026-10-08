import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callPlannerJson, callPlannerModel, parsePlanJson } from './model'

const mocks = vi.hoisted(() => ({ primary: vi.fn(), fallback: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { stream: () => ({ finalMessage: mocks.primary }) }
  },
}))
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mocks.fallback } }
  },
}))
const primary = (text: string, stop = 'end_turn') => ({
  content: [{ type: 'text', text }],
  stop_reason: stop,
  usage: { input_tokens: 20, output_tokens: 20 },
})
const fallback = (text: string, stop = 'stop') => ({
  choices: [{ finish_reason: stop, message: { content: text } }],
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
  vi.stubEnv('OPENAI_API_KEY', 'test-key')
})
afterEach(() => vi.unstubAllEnvs())

describe('planner provider failure recovery', () => {
  it('rejects even parseable JSON when the provider reports truncation', async () => {
    mocks.primary.mockResolvedValue(primary('{"proyecto":"incompleto"}', 'max_tokens'))
    mocks.fallback.mockResolvedValue(fallback('{"proyecto":"completo"}'))
    expect(await callPlannerJson('JSON', 'plan')).toEqual({ proyecto: 'completo' })
    expect(mocks.fallback).toHaveBeenCalledOnce()
  })

  it('does not salvage truncated output when there is no fallback configured', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    mocks.primary.mockResolvedValue(primary('{"proyecto":"parcial"}', 'max_tokens'))
    await expect(callPlannerJson('JSON', 'plan')).rejects.toThrow('incompleta')
  })

  it('retries invalid primary JSON once and rejects a truncated fallback', async () => {
    mocks.primary.mockResolvedValue(primary('{"proyecto":'))
    mocks.fallback.mockResolvedValue(fallback('{"proyecto":"parcial"}', 'length'))
    await expect(callPlannerJson('JSON', 'plan')).rejects.toThrow('no terminó')
    expect(mocks.fallback).toHaveBeenCalledOnce()
  })

  it('does not require JSON from the fallback when rewriting plain text', async () => {
    mocks.primary.mockRejectedValue(new Error('unavailable'))
    mocks.fallback.mockResolvedValue(fallback('Clima: observaremos el cielo.'))
    expect(await callPlannerModel('Solo texto', 'Completa la sección')).toBe(
      'Clima: observaremos el cielo.'
    )
    expect(mocks.fallback.mock.calls[0][0]).not.toHaveProperty('response_format')
    expect(mocks.fallback.mock.calls[0][1]).toMatchObject({ maxRetries: 0, timeout: 75000 })
  })

  it('reports a provider outage clearly when primary access is rejected and fallback times out', async () => {
    mocks.primary.mockRejectedValue(new Error('403 Request not allowed'))
    mocks.fallback.mockRejectedValue(new Error('Request timed out'))
    await expect(callPlannerJson('JSON', 'plan')).rejects.toThrow(
      'servicio de IA no está disponible'
    )
    expect(mocks.fallback).toHaveBeenCalledOnce()
  })

  it('collects all text blocks in a completed response', async () => {
    mocks.primary.mockResolvedValue({
      ...primary('Inicio'),
      content: [
        { type: 'text', text: 'Inicio' },
        { type: 'text', text: 'Cierre' },
      ],
    })
    expect(await callPlannerModel('text', 'plan')).toBe('Inicio\nCierre')
  })

  it('does not start or retry calls after the generation deadline', async () => {
    const controller = new AbortController()
    controller.abort(new Error('deadline'))
    await expect(callPlannerJson('JSON', 'plan', { signal: controller.signal })).rejects.toThrow(
      'deadline'
    )
    expect(mocks.primary).not.toHaveBeenCalled()
    expect(mocks.fallback).not.toHaveBeenCalled()
  })

  it('rejects null and arrays instead of treating them as a plan', () => {
    for (const text of ['null', '[]', '"un plan"', '{"a":{"b":1},"c":'])
      expect(() => parsePlanJson(text)).toThrow()
  })
})
