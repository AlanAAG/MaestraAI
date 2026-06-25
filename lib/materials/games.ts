// lib/materials/games.ts
import Anthropic from '@anthropic-ai/sdk'
import { GAMES_PROMPT } from '@/prompts/materials'
import type { FortnightContext } from './types'
import { extractJson } from './ai-json'

export type GameContent = {
  game_type: 'memory_match'
  pairs: Array<{
    id: string
    word: string
    visual_hint: string
    pair_type?: 'word_to_picture' | 'word_to_word'
    image_query?: string
    image_url?: string
    emoji?: string
  }>
}

export async function buildGameContent(
  vocabulary: string[],
  gameType: string = 'memory_match',
  context?: FortnightContext,
  imageMap?: Record<string, string>
): Promise<GameContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const contextBlock = context
    ? `Contexto de clase:\n- Proyecto: ${context.project_name}\n- Unidad Richmond: ${context.richmond_unit ?? 'N/A'}\n- Valor del mes: ${context.monthly_value ?? 'N/A'}\n\n`
    : ''

  const userMessage = `${contextBlock}Vocabulario para el juego:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Tipo de juego: ${gameType}

Genera pares de memoria para este vocabulario.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0.4,
    system: GAMES_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const result = extractJson(content.text) as GameContent

  // Enforce the 6-pair cap (working memory) + dedup by word; the prompt asks but didn't enforce it.
  const seen = new Set<string>()
  result.pairs = (result.pairs ?? [])
    .filter((p) => {
      const key = p.word?.toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
    .map((pair) => ({
      ...pair,
      id: String(pair.id),
      image_url: imageMap?.[pair.word.toLowerCase()] ?? pair.image_url,
    }))

  return result
}
