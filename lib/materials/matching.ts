import Anthropic from '@anthropic-ai/sdk'
import { MATCHING_PROMPT } from '@/prompts/materials'

export type MatchingLevel = 'bajo' | 'medio' | 'alto'

export type MatchingPair = {
  left: string
  right: string
  left_type: 'word' | 'image_description'
  right_type: 'image_description' | 'sentence'
}

export type MatchingContent = {
  level: MatchingLevel
  pairs: MatchingPair[]
  teacher_note: string
}

export async function buildMatching(
  vocabulary: string[],
  level: MatchingLevel = 'medio'
): Promise<MatchingContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = MATCHING_PROMPT.replace('{vocabulary}', vocabulary.join(', ')).replace(
    '{level}',
    level
  )

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')
  try {
    return JSON.parse(raw) as MatchingContent
  } catch {
    throw new Error('Respuesta de Claude no es JSON válido')
  }
}
