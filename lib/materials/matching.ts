import { OPENAI_MODELS } from '@/lib/ai/models'
import OpenAIProvider from '@/lib/ai/openai-provider'
import { MATCHING_PROMPT } from '@/prompts/materials'
import { keepVocabItems } from './own-vocab'
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
  const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })

  const contextBlock = classContextBlock(context)

  const prompt = contextBlock + MATCHING_PROMPT.replace('{vocabulary}', vocabulary.join(', '))

  const response = await provider.messages.create({
    jsonMode: true,
    model: OPENAI_MODELS.routine,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from OpenAI')

  const result = extractJson(content.text) as MatchingContent

  if (imageMap && Object.keys(imageMap).length > 0) {
    result.pairs = result.pairs.map((pair) => ({
      ...pair,
      image_url: imageMap[pair.word.toLowerCase()] ?? pair.image_url,
    }))
  }

  result.pairs = keepVocabItems(result.pairs ?? [], (p) => p.word, vocabulary, 2)
  return result
}
