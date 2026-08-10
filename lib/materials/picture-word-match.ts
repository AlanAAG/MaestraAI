import Anthropic from '@anthropic-ai/sdk'
import type { FortnightContext } from './types'
import { extractJson } from './ai-json'
import { sanitizeEmoji } from './emoji'
import { keepVocabItems, vocabFoils } from './own-vocab'

export type PictureWordMatchItem = {
  word: string
  image_url?: string
  emoji?: string
  foils: string[]
  /** Letter being studied for this word — shown next to the picture as "A a". */
  letter?: string
}

/** The quincena letter this word belongs to (its initial), else the word's own initial. */
export function studiedLetter(word: string, letters: string[] = []): string {
  const initial = word.trim()[0] ?? ''
  const match = letters.find((l) => l.trim()[0]?.toUpperCase() === initial.toUpperCase())
  return (match?.trim()[0] ?? initial).toUpperCase()
}

export type PictureWordMatchContent = {
  items: PictureWordMatchItem[]
}

export async function buildPictureWordMatch(
  vocabulary: string[],
  ctx: FortnightContext,
  imageMap: Record<string, string> = {},
  letters: string[] = []
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
    // Her vocabulary only — both the prompts AND the wrong-answer choices, so a child never sees
    // a word the teacher never taught.
    items: keepVocabItems(parsed.items, (i) => i.word, vocabulary).map((item) => ({
      word: item.word,
      foils: vocabFoils(item.word, vocabulary, 3, item.foils ?? []),
      emoji: sanitizeEmoji(item.emoji),
      image_url: imageMap[item.word.toLowerCase()],
      letter: studiedLetter(item.word, letters),
    })),
  }
}
