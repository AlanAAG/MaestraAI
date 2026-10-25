import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.hoisted(() => vi.fn())
vi.mock('openai', () => ({
  default: class {
    responses = { create }
  },
}))
import OpenAIProvider from './openai-provider'

const completed = (output: unknown[] = []) => ({
  status: 'completed',
  output,
  usage: { input_tokens: 12, output_tokens: 8 },
})
const provider = new OpenAIProvider({ apiKey: 'test-key' })
beforeEach(() => vi.clearAllMocks())

describe('OpenAI Responses bridge', () => {
  it('sends images and PDFs as data inputs and keeps requests stateless', async () => {
    create.mockResolvedValueOnce(
      completed([{ type: 'message', content: [{ type: 'output_text', text: '{}' }] }])
    )
    await provider.messages.create({
      model: 'gpt-6-luna',
      max_tokens: 400,
      jsonMode: true,
      system: 'Extract JSON',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { media_type: 'image/png', data: 'aW1hZ2U=' } },
            { type: 'document', source: { media_type: 'application/pdf', data: 'cGRm' } },
            { type: 'text', text: 'Read both' },
          ],
        },
      ],
    })
    expect(create.mock.calls[0][0]).toMatchObject({
      model: 'gpt-6-luna',
      store: false,
      reasoning: { effort: 'none' },
      max_output_tokens: 400,
      instructions: 'Responde solo con un objeto JSON válido.\n\nExtract JSON',
      text: { format: { type: 'json_object' } },
    })
    const parts = create.mock.calls[0][0].input[0].content
    expect(create.mock.calls[0][0].input.at(-1)).toEqual({
      role: 'user',
      content: 'Responde en JSON.',
    })
    expect(parts[0]).toMatchObject({
      type: 'input_image',
      image_url: 'data:image/png;base64,aW1hZ2U=',
    })
    expect(parts[1]).toMatchObject({
      type: 'input_file',
      file_data: 'data:application/pdf;base64,cGRm',
    })
  })

  it('maps tool calls and their results into a stateless continuation', async () => {
    create.mockResolvedValueOnce(
      completed([
        {
          type: 'function_call',
          id: 'fc_1',
          call_id: 'call_1',
          name: 'editar_seccion',
          arguments: '{"seccion":"proyecto"}',
        },
      ])
    )
    const first = await provider.messages.create({
      model: 'gpt-6-luna',
      max_tokens: 800,
      messages: [{ role: 'user', content: 'Edit the plan' }],
      tools: [
        {
          name: 'editar_seccion',
          description: 'Edit',
          input_schema: {
            type: 'object',
            properties: { seccion: { type: 'string' } },
            required: ['seccion'],
          },
        },
      ],
    })
    expect(first.stop_reason).toBe('tool_use')
    expect(first.content[0]).toMatchObject({
      type: 'tool_use',
      id: 'call_1',
      response_item_id: 'fc_1',
      name: 'editar_seccion',
      input: { seccion: 'proyecto' },
    })
    create.mockResolvedValueOnce(completed())
    await provider.messages.create({
      model: 'gpt-6-luna',
      max_tokens: 800,
      messages: [
        { role: 'user', content: 'Edit the plan' },
        { role: 'assistant', content: first.content },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'call_1', content: 'Done' }],
        },
      ],
    })
    expect(create.mock.calls[1][0].input.slice(1)).toEqual([
      {
        type: 'function_call',
        id: 'fc_1',
        call_id: 'call_1',
        name: 'editar_seccion',
        arguments: '{"seccion":"proyecto"}',
      },
      { type: 'function_call_output', call_id: 'call_1', output: 'Done' },
    ])
  })

  it('reports incomplete output rather than accepting partial text', async () => {
    create.mockResolvedValueOnce({ ...completed(), status: 'incomplete' })
    await expect(
      provider.messages.create({
        model: 'gpt-6-luna',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Hi' }],
      })
    ).rejects.toThrow('incompleta')
  })

  it('uses the existing OpenAI compatibility model if Luna is unavailable', async () => {
    create.mockRejectedValueOnce(Object.assign(new Error('model unavailable'), { status: 404 }))
    create.mockResolvedValueOnce(
      completed([{ type: 'message', content: [{ type: 'output_text', text: '{}' }] }])
    )
    await provider.messages.create({
      model: 'gpt-6-luna',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Return JSON' }],
      jsonMode: true,
    })
    expect(create.mock.calls[1][0]).toMatchObject({
      model: 'gpt-4o-mini',
      text: { format: { type: 'json_object' } },
    })
    expect(create.mock.calls[1][0]).not.toHaveProperty('reasoning')
  })

  it('streams only text deltas and requires a completion event', async () => {
    create.mockResolvedValueOnce(
      (async function* () {
        yield { type: 'response.output_text.delta', delta: 'Hola' }
        yield { type: 'response.completed' }
      })()
    )
    const chunks: string[] = []
    for await (const event of provider.messages.stream({
      model: 'gpt-6-luna',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Hi' }],
    })) {
      chunks.push(event.delta.text)
    }
    expect(chunks).toEqual(['Hola'])
  })
})
