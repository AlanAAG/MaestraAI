// lib/materials/flashcards.ts
import Anthropic from '@anthropic-ai/sdk'
import { FLASHCARDS_PROMPT } from '@/prompts/materials'

export type FlashcardContent = {
  cards: Array<{
    word: string
    definition: string
    example: string
    color: string
  }>
}

export async function buildFlashcardContent(vocabulary: string[]): Promise<FlashcardContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userMessage = `
Vocabulario a generar flashcards:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Genera una flashcard para cada palabra del vocabulario.
`.trim()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    temperature: 0.7,
    system: FLASHCARDS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0]) as FlashcardContent
  } catch {
    console.error('Failed to parse flashcard response:', content.text)
    throw new Error('Failed to parse flashcard content')
  }
}
