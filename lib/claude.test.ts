import { describe, it, expect, vi } from 'vitest'

// Mock Anthropic SDK before import
vi.mock('@anthropic-ai/sdk', () => {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hola ' } }
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'maestra.' } }
      yield { type: 'message_stop' }
    },
  }

  class MockAnthropic {
    messages = {
      stream: vi.fn().mockReturnValue(mockStream),
    }
  }

  return { default: MockAnthropic }
})

import { streamToString } from './claude'

describe('streamToString', () => {
  it('accumulates all streamed text chunks into a single string', async () => {
    const result = await streamToString('system prompt', 'user message')
    expect(result).toBe('Hola maestra.')
  })

  it('ignores non text_delta events', async () => {
    const result = await streamToString('system prompt', 'user message')
    expect(result).not.toContain('message_stop')
  })
})
