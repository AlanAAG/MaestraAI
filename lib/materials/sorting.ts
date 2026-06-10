import Anthropic from '@anthropic-ai/sdk'
import type { FortnightContext } from './types'

export type SortingCategory = {
  name: string
  color: string
}

export type SortingItem = {
  word: string
  category: string
  image_url?: string
}

export type SortingContent = {
  categories: SortingCategory[]
  items: SortingItem[]
}

// Tailwind classes for bins — 3 distinct palettes
const BIN_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-rose-100 border-rose-300 text-rose-800',
  'bg-amber-100 border-amber-300 text-amber-800',
]

export async function buildSortingGame(
  vocabulary: string[],
  ctx: FortnightContext,
  imageMap: Record<string, string> = {}
): Promise<SortingContent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const prompt = `You are creating a vocabulary sorting game for Kinder 3 students (ages 5-6) learning English in Mexico.

Vocabulary: ${vocabulary.join(', ')}
Class theme: ${ctx.project_name}

Group these English words into 2 or 3 simple, concrete categories. Categories must be:
- Based on obvious visual features a 5-year-old recognizes (animals vs objects, food vs toys, big vs small, etc.)
- Named in SPANISH (the teacher will say the category name aloud)
- Clearly distinct — no word could fit in two categories

Return ONLY valid JSON with no markdown or explanation:
{
  "categories": [
    { "name": "Animales" },
    { "name": "Juguetes" }
  ],
  "items": [
    { "word": "cat", "category": "Animales" },
    { "word": "ball", "category": "Juguetes" }
  ]
}

Assign EVERY vocabulary word to exactly one category. Use at most 3 categories.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]
  if (text.type !== 'text') throw new Error('Unexpected response type')

  const raw = text.text.match(/\{[\s\S]*\}/)?.[0]
  if (!raw) throw new Error('No JSON in response')

  const parsed = JSON.parse(raw) as {
    categories: Array<{ name: string }>
    items: Array<{ word: string; category: string }>
  }

  return {
    categories: parsed.categories.slice(0, 3).map((cat, i) => ({
      name: cat.name,
      color: BIN_COLORS[i] ?? BIN_COLORS[0],
    })),
    items: parsed.items.map((item) => ({
      word: item.word,
      category: item.category,
      image_url: imageMap[item.word.toLowerCase()],
    })),
  }
}
