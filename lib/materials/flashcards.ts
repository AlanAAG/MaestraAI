import { OPENAI_MODELS } from '@/lib/ai/models'
// lib/materials/flashcards.ts
import OpenAIProvider from '@/lib/ai/openai-provider'
import { FLASHCARDS_PROMPT } from '@/prompts/materials'
import { classContextBlock, type FortnightContext } from './types'
import { extractJson } from './ai-json'

export type FlashcardContent = {
  cards: Array<{
    word: string
    definition: string
    color: string
    phonetic?: string
    image_query?: string
    image_url?: string
    emoji?: string
    // kept for backward compat with older stored content
    example?: string
  }>
}

export async function buildFlashcardContent(
  vocabulary: string[],
  context?: FortnightContext,
  imageMap?: Record<string, string>
): Promise<FlashcardContent> {
  const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })

  const contextBlock = classContextBlock(context)

  const userMessage = `${contextBlock}Vocabulario a generar flashcards:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Genera una flashcard para cada palabra del vocabulario.`

  const response = await provider.messages.create({
    jsonMode: true,
    model: OPENAI_MODELS.routine,
    max_tokens: 2048,
    system: FLASHCARDS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from OpenAI')
  }

  const result = extractJson(content.text) as FlashcardContent

  if (imageMap && Object.keys(imageMap).length > 0) {
    result.cards = result.cards.map((card) => ({
      ...card,
      image_url: imageMap[card.word.toLowerCase()] ?? card.image_url,
    }))
  }

  return result
}
