// @vitest-environment node
// Explicit opt-in: verifies the stateless tool-call path used by planner chat.
import { describe, expect, it } from 'vitest'
import OpenAIProvider from './openai-provider'
import { OPENAI_MODELS } from './models'

describe.skipIf(process.env.AI_TOOLS_LIVE_SMOKE !== '1')('live OpenAI tool continuation', () => {
  it('calls a tool and accepts its result in the following turn', async () => {
    process.loadEnvFile('.env.local')
    const provider = new OpenAIProvider()
    const prompt = 'Use the sumar tool to add 2 and 3. Then tell me the result.'
    const first = await provider.messages.create({
      model: OPENAI_MODELS.routine,
      max_tokens: 300,
      system: 'Always use the provided tool for arithmetic.',
      messages: [{ role: 'user', content: prompt }],
      tools: [
        {
          name: 'sumar',
          description: 'Adds two numbers.',
          input_schema: {
            type: 'object',
            properties: { a: { type: 'number' }, b: { type: 'number' } },
            required: ['a', 'b'],
          },
        },
      ],
    })
    const call = first.content.find((block) => block.type === 'tool_use')
    expect(call).toMatchObject({ type: 'tool_use', name: 'sumar' })
    if (!call || call.type !== 'tool_use') throw new Error('No tool call')
    const second = await provider.messages.create({
      model: OPENAI_MODELS.routine,
      max_tokens: 300,
      system: 'Respond with the computed result.',
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: first.content },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id, content: '5' }] },
      ],
    })
    expect(
      second.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join(' ')
    ).toContain('5')
  }, 60_000)
})
