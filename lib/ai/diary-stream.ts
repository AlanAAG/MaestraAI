import { OPENAI_MODELS } from '@/lib/ai/models'
import OpenAIProvider from '@/lib/ai/openai-provider'

const MODEL = OPENAI_MODELS.routine

/** Streams OpenAI response and returns the full accumulated text. */
export async function streamToString(systemPrompt: string, userMessage: string): Promise<string> {
  const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })
  const stream = provider.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  let text = ''
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text
    }
  }
  return text
}

/**
 * Streams OpenAI response to a ReadableStream (for SSE API routes).
 * Caller is responsible for closing the controller.
 */
export function streamToReadable(
  systemPrompt: string,
  userMessage: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })
      const stream = provider.messages.stream({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
  })
}
