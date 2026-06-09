// lib/materials/games.ts
import Anthropic from '@anthropic-ai/sdk'
import { GAMES_PROMPT } from '@/prompts/materials'

export type GameContent = {
  game_type: 'memory_match'
  pairs: Array<{
    id: number
    word: string
    visual_hint: string
    pair_type?: 'word_to_picture' | 'word_to_word'
    image_description?: string
  }>
}

export async function buildGameContent(
  vocabulary: string[],
  gameType: string = 'memory_match'
): Promise<GameContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userMessage = `
Vocabulario para el juego:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Tipo de juego: ${gameType}

Genera pares de memoria para este vocabulario.
`.trim()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    temperature: 0.7,
    system: GAMES_PROMPT,
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
    return JSON.parse(raw) as GameContent
  } catch {
    throw new Error('Respuesta de Claude no es JSON válido')
  }
}
