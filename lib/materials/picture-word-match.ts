import Anthropic from '@anthropic-ai/sdk'
import type { FortnightContext } from './types'
import { extractJson } from './ai-json'

export type PictureWordMatchItem = {
  word: string
  image_url?: string
  emoji?: string
  foils: string[]
}

export type PictureWordMatchContent = {
  items: PictureWordMatchItem[]
}

export async function buildPictureWordMatch(
  vocabulary: string[],
  ctx: FortnightContext,
  imageMap: Record<string, string> = {}
): Promise<PictureWordMatchContent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const prompt = `You are creating a picture-word matching game for Kinder 3 students (ages 5-6) learning English in Mexico.

Vocabulary words: ${vocabulary.join(', ')}
Class theme: ${ctx.project_name}

For each vocabulary word, generate exactly 3 FOIL words (wrong answer choices) that are:
- Same category (e.g. other animals if the word is "cat")
- Simple, 1-2 syllables, familiar to 5-year-olds
- Different enough visually that a child can distinguish them as pictures

For each word also give "emoji": the single best emoji for that word's exact sense (🐱 for cat). Use "" if none fits.

Return ONLY valid JSON with no markdown or explanation:
{
  "items": [
    { "word": "cat", "emoji": "🐱", "foils": ["dog", "bird", "fish"] }
  ]
}

Include ALL ${vocabulary.length} vocabulary words.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]
  if (text.type !== 'text') throw new Error('Unexpected response type')

  const parsed = extractJson(text.text) as {
    items: Array<{ word: string; foils: string[]; emoji?: string }>
  }

  return {
    items: parsed.items.map((item) => ({
      word: item.word,
      foils: item.foils.slice(0, 3),
      emoji: item.emoji || undefined,
      image_url: imageMap[item.word.toLowerCase()],
    })),
  }
}
