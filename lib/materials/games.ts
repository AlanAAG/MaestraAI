// lib/materials/games.ts
import Anthropic from '@anthropic-ai/sdk'
import { GAMES_PROMPT } from '@/prompts/materials'

export type GameContent = {
  game_type: 'memory_match'
  pairs: Array<{
    id: number
    word: string
    visual_hint: string
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

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0]) as GameContent
  } catch {
    console.error('Failed to parse game response:', content.text)
    throw new Error('Failed to parse game content')
  }
}
