// lib/materials/flashcards.ts
import Anthropic from '@anthropic-ai/sdk'
import { FLASHCARDS_PROMPT } from '@/prompts/materials'

export type FlashcardContent = {
  cards: Array<{
    word: string
    definition: string
    example: string
    color: string
    phonetic?: string
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

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')
  try {
    return JSON.parse(raw) as FlashcardContent
  } catch {
    throw new Error('Respuesta de Claude no es JSON válido')
  }
}
