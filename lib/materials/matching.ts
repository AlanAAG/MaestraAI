import Anthropic from '@anthropic-ai/sdk'
import { MATCHING_PROMPT } from '@/prompts/materials'
import type { FortnightContext } from './types'

export type MatchingPair = {
  word: string
  image_description: string
  image_query: string
  translation: string
  image_url?: string
}

export type MatchingContent = {
  pairs: MatchingPair[]
  teacher_note: string
}

export async function buildMatching(
  vocabulary: string[],
  context?: FortnightContext,
  imageMap?: Record<string, string>
): Promise<MatchingContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const contextBlock = context
    ? `Contexto de clase:\n- Proyecto: ${context.project_name}\n- Unidad Richmond: ${context.richmond_unit ?? 'N/A'}\n- Valor del mes: ${context.monthly_value ?? 'N/A'}\n\n`
    : ''

  const prompt = contextBlock + MATCHING_PROMPT.replace('{vocabulary}', vocabulary.join(', '))

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')

  const result = JSON.parse(raw) as MatchingContent

  if (imageMap && Object.keys(imageMap).length > 0) {
    result.pairs = result.pairs.map((pair) => ({
      ...pair,
      image_url: imageMap[pair.word.toLowerCase()] ?? pair.image_url,
    }))
  }

  return result
}
