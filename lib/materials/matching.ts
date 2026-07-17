import Anthropic from '@anthropic-ai/sdk'
import { MATCHING_PROMPT } from '@/prompts/materials'
import { classContextBlock, type FortnightContext } from './types'
import { extractJson } from './ai-json'

export type MatchingPair = {
  word: string
  image_description: string
  image_query: string
  translation: string
  image_url?: string
  emoji?: string
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

  const contextBlock = classContextBlock(context)

  const prompt = contextBlock + MATCHING_PROMPT.replace('{vocabulary}', vocabulary.join(', '))

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const result = extractJson(content.text) as MatchingContent

  if (imageMap && Object.keys(imageMap).length > 0) {
    result.pairs = result.pairs.map((pair) => ({
      ...pair,
      image_url: imageMap[pair.word.toLowerCase()] ?? pair.image_url,
    }))
  }

  return result
}
