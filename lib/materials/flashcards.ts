// lib/materials/flashcards.ts
import Anthropic from '@anthropic-ai/sdk'
import { FLASHCARDS_PROMPT } from '@/prompts/materials'
import type { FortnightContext } from './types'

export type FlashcardContent = {
  cards: Array<{
    word: string
    definition: string
    color: string
    phonetic?: string
    image_query?: string
    image_url?: string
    // kept for backward compat with older stored content
    example?: string
  }>
}

export async function buildFlashcardContent(
  vocabulary: string[],
  context?: FortnightContext,
  imageMap?: Record<string, string>
): Promise<FlashcardContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const contextBlock = context
    ? `Contexto de clase:\n- Proyecto: ${context.project_name}\n- Unidad Richmond: ${context.richmond_unit ?? 'N/A'}\n- Valor del mes: ${context.monthly_value ?? 'N/A'}\n\n`
    : ''

  const userMessage = `${contextBlock}Vocabulario a generar flashcards:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Genera una flashcard para cada palabra del vocabulario.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    temperature: 0.3,
    system: FLASHCARDS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')

  const result = JSON.parse(raw) as FlashcardContent

  if (imageMap && Object.keys(imageMap).length > 0) {
    result.cards = result.cards.map((card) => ({
      ...card,
      image_url: imageMap[card.word.toLowerCase()] ?? card.image_url,
    }))
  }

  return result
}
