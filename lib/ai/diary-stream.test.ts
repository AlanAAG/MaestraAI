import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/ai/openai-provider', () => ({
  default: class {
    messages = {
      stream: () => ({
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hola ' } }
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'maestra.' } }
        },
      }),
    }
  },
}))

import { streamToString } from './diary-stream'

describe('diary stream', () => {
  it('accumulates all streamed text chunks into a single string', async () => {
    expect(await streamToString('system prompt', 'user message')).toBe('Hola maestra.')
  })
})
