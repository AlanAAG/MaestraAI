import { OPENAI_MODELS } from '@/lib/ai/models'
import OpenAI from 'openai'

// A small bridge for the application's existing message contracts. Every request goes to
// OpenAI Responses; keeping the old content shape here lets the feature parsers stay intact.
type TextBlock = { type: 'text'; text: string }
type ImageBlock = { type: 'image'; source: { type?: 'base64'; media_type: string; data: string } }
type DocumentBlock = {
  type: 'document'
  source: { type?: 'base64'; media_type: string; data: string }
}
type ToolUseBlock = {
  type: 'tool_use'
  id: string
  response_item_id?: string
  name: string
  input: unknown
}
type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}
type ContentBlock = TextBlock | ImageBlock | DocumentBlock | ToolUseBlock | ToolResultBlock
type Message = { role: 'user' | 'assistant'; content: string | ContentBlock[] }
type Tool = {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, unknown>; required: readonly string[] }
}
type Request = {
  model: string
  max_tokens: number
  jsonMode?: boolean
  system?: string | { text: string }[]
  messages: Message[]
  tools?: readonly Tool[]
}
type Reply = {
  content: (TextBlock | ToolUseBlock)[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens'
  usage: { input_tokens: number; output_tokens: number }
}

function convertContent(content: Message['content']) {
  if (typeof content === 'string') return content
  return content
    .map((block) => {
      if (block.type === 'text') return { type: 'input_text' as const, text: block.text }
      if (block.type === 'image')
        return {
          type: 'input_image' as const,
          image_url: `data:${block.source.media_type === 'image/jpg' ? 'image/jpeg' : block.source.media_type};base64,${block.source.data}`,
        }
      if (block.type === 'document')
        return {
          type: 'input_file' as const,
          filename: 'document.pdf',
          file_data: `data:${block.source.media_type};base64,${block.source.data}`,
        }
      return null
    })
    .filter((item) => item !== null)
}

function convertMessages(messages: Message[]) {
  const input: unknown[] = []
  for (const message of messages) {
    if (typeof message.content === 'string') {
      input.push({ role: message.role, content: message.content })
      continue
    }
    const ordinary = message.content.filter(
      (block) => block.type === 'text' || block.type === 'image' || block.type === 'document'
    )
    if (ordinary.length) {
      input.push({
        role: message.role,
        content:
          message.role === 'assistant'
            ? ordinary
                .filter((block): block is TextBlock => block.type === 'text')
                .map((block) => block.text)
                .join('\n')
            : convertContent(ordinary),
      })
    }
    for (const block of message.content) {
      if (block.type === 'tool_use')
        input.push({
          type: 'function_call',
          ...(block.response_item_id ? { id: block.response_item_id } : {}),
          call_id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        })
      if (block.type === 'tool_result')
        input.push({
          type: 'function_call_output',
          call_id: block.tool_use_id,
          output: block.is_error ? `Error: ${block.content}` : block.content,
        })
    }
  }
  return input
}

function requestBody(request: Request) {
  const instructions = Array.isArray(request.system)
    ? request.system.map((part) => part.text).join('\n\n')
    : request.system
  return {
    model: request.model,
    instructions: request.jsonMode
      ? `Responde solo con un objeto JSON válido.\n\n${instructions ?? ''}`
      : instructions,
    input: convertMessages(request.messages) as OpenAI.Responses.ResponseInput,
    max_output_tokens: request.max_tokens,
    ...(request.jsonMode ? { text: { format: { type: 'json_object' as const } } } : {}),
    ...(request.model === OPENAI_MODELS.routine || request.model === OPENAI_MODELS.planning
      ? {
          reasoning: {
            effort: request.model === OPENAI_MODELS.routine ? ('none' as const) : ('low' as const),
          },
        }
      : {}),
    ...(request.tools?.length
      ? {
          tools: request.tools.map((tool) => ({
            type: 'function' as const,
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema,
            strict: false,
          })),
        }
      : {}),
    store: false,
  }
}

function convertReply(response: OpenAI.Responses.Response): Reply {
  if (response.status === 'incomplete') {
    throw new Error('La respuesta de la IA quedó incompleta.')
  }
  if (response.status !== 'completed') {
    throw new Error(`OpenAI response did not complete (${response.status})`)
  }
  const content: Reply['content'] = []
  for (const item of response.output) {
    if (item.type === 'message') {
      for (const part of item.content) {
        if (part.type === 'output_text' && part.text)
          content.push({ type: 'text', text: part.text })
      }
    } else if (item.type === 'function_call') {
      let parsed: unknown = {}
      try {
        parsed = JSON.parse(item.arguments)
      } catch {
        /* invalid tool input is rejected by caller */
      }
      content.push({
        type: 'tool_use',
        id: item.call_id,
        response_item_id: item.id,
        name: item.name,
        input: parsed,
      })
    }
  }
  return {
    content,
    stop_reason: content.some((item) => item.type === 'tool_use') ? 'tool_use' : 'end_turn',
    usage: {
      input_tokens: response.usage?.input_tokens ?? 0,
      output_tokens: response.usage?.output_tokens ?? 0,
    },
  }
}

export default class OpenAIProvider {
  private client: OpenAI
  constructor(options: { apiKey?: string; timeout?: number; maxRetries?: number } = {}) {
    this.client = new OpenAI({
      apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
      timeout: options.timeout,
      maxRetries: options.maxRetries ?? 0,
    })
  }

  messages = {
    create: async (request: Request, options?: { signal?: AbortSignal; timeout?: number }) => {
      let active = request
      let response: OpenAI.Responses.Response
      try {
        response = await this.client.responses.create(requestBody(active), options)
      } catch (error) {
        if (request.model !== OPENAI_MODELS.routine || !isModelUnavailable(error)) throw error
        active = { ...request, model: OPENAI_MODELS.compatibility }
        console.warn(`[openai] ${request.model} unavailable; using ${active.model}`)
        response = await this.client.responses.create(requestBody(active), options)
      }
      console.log(
        `[openai-usage] ${active.model}: in=${response.usage?.input_tokens ?? 0} out=${response.usage?.output_tokens ?? 0} status=${response.status}`
      )
      return convertReply(response)
    },
    stream: (request: Request, options?: { signal?: AbortSignal; timeout?: number }) => {
      const create = this.messages.create
      const client = this.client
      return {
        finalMessage: () => create(request, options),
        async *[Symbol.asyncIterator]() {
          let stream
          try {
            stream = await client.responses.create(
              { ...requestBody(request), stream: true },
              options
            )
          } catch (error) {
            if (request.model !== OPENAI_MODELS.routine || !isModelUnavailable(error)) throw error
            console.warn(
              `[openai] ${request.model} unavailable; using ${OPENAI_MODELS.compatibility}`
            )
            stream = await client.responses.create(
              { ...requestBody({ ...request, model: OPENAI_MODELS.compatibility }), stream: true },
              options
            )
          }
          let completed = false
          for await (const event of stream) {
            if (event.type === 'response.output_text.delta') {
              yield {
                type: 'content_block_delta' as const,
                delta: { type: 'text_delta' as const, text: event.delta },
              }
            }
            if (event.type === 'response.completed') completed = true
            if (event.type === 'response.incomplete' || event.type === 'response.failed') {
              throw new Error(`OpenAI stream ended with ${event.type}`)
            }
          }
          if (!completed) throw new Error('OpenAI stream ended before completion')
        },
      }
    },
  }
}

export type MessageParam = Message
export type TextBlockParam = TextBlock
export type ToolResultBlockParam = ToolResultBlock

/** Authentication, billing, and invalid-request errors affect both model tiers. */
export function shouldTryAnotherModel(error: unknown): boolean {
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : NaN
  return ![400, 401, 403, 429].includes(status)
}

function isModelUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { status?: number; code?: string }
  return e.status === 404 || e.code === 'model_not_found'
}
