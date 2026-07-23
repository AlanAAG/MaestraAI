import Anthropic from '@anthropic-ai/sdk'
import type { FortnightContext } from './types'
import { extractJson } from './ai-json'
import { sanitizeEmoji } from './emoji'

export type SortingCategory = {
  name: string
  color: string
}

export type SortingItem = {
  word: string
  category: string
  image_url?: string
  emoji?: string
}

export type SortingContent = {
  categories: SortingCategory[]
  items: SortingItem[]
}

// Tailwind classes for bins — distinct palettes (supports up to 5 categories)
const BIN_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-rose-100 border-rose-300 text-rose-800',
  'bg-amber-100 border-amber-300 text-amber-800',
  'bg-emerald-100 border-emerald-300 text-emerald-800',
  'bg-violet-100 border-violet-300 text-violet-800',
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

Look at the ACTUAL words and choose 2 or 3 categories that genuinely fit ALL of them. Pick the
categories from what the words actually are — do NOT default to "animals vs objects". For example:
- people / roles (baby, astronaut, doctor, mom) → "People"
- actions / verbs (run, jump, eat) → "Actions"
- food, animals, toys, clothes, body parts, places, colors, transport… → use whichever fit
Rules for the categories:
- Every word must clearly belong to exactly ONE category (no word that fits two, no word left over).
- If some words don't fit the others (e.g. "baby", "astronaut" among animals), ADD a category that
  covers them (like "People") instead of forcing them into a wrong bin.
- Named in simple ENGLISH (this is an English class — e.g. "Animals", "Things", "People", "Food").

For each item also give "emoji": the single best emoji for that word's exact sense (🐱 for cat, 👶 for baby, 👨‍🚀 for astronaut). Use "" if none fits.

Return ONLY valid JSON with no markdown or explanation:
{
  "categories": [
    { "name": "Animals" },
    { "name": "Toys" }
  ],
  "items": [
    { "word": "cat", "category": "Animals", "emoji": "🐱" },
    { "word": "ball", "category": "Toys", "emoji": "⚽" }
  ]
}

Assign EVERY vocabulary word to exactly one category. Use at most 3 categories.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]
  if (text.type !== 'text') throw new Error('Unexpected response type')

  const parsed = extractJson(text.text) as {
    categories: Array<{ name: string }>
    items: Array<{ word: string; category: string; emoji?: string }>
  }

  const categories = parsed.categories.slice(0, BIN_COLORS.length).map((cat, i) => ({
    name: cat.name,
    color: BIN_COLORS[i] ?? BIN_COLORS[0],
  }))
  const validCats = new Set(categories.map((c) => c.name))
  const fallbackCat = categories[0]?.name ?? 'Otros'

  const items = parsed.items.map((item) => ({
    word: item.word,
    // Guard against an uncategorized/hallucinated category so the game stays playable.
    category: validCats.has(item.category) ? item.category : fallbackCat,
    emoji: sanitizeEmoji(item.emoji),
    image_url: imageMap[item.word.toLowerCase()],
  }))

  return { categories, items }
}
