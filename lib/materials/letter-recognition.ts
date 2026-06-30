import Anthropic from '@anthropic-ai/sdk'
import { LETTER_RECOGNITION_PROMPT } from '@/prompts/materials'
import { wordToEmoji } from './emoji'

export type ActivityType = 'hear_and_circle' | 'match_to_letter' | 'trace_and_say'

export type LetterRecognitionItem = {
  word: string
  target_letter: string
  image_description: string
  foil_letters: string[]
  // A real visual for the word (so kids see a picture, not just the distractor letters).
  emoji?: string
  image_url?: string
}

export type LetterRecognitionContent = {
  activity_type: ActivityType
  teacher_instructions: string
  student_instructions: string
  items: LetterRecognitionItem[]
}

// Visually-confusable letters per target (a POOL — we pick a varied subset per item so the
// distractors aren't the same 3 every time). Richer than the prompt's old fixed 3.
const CONFUSABLE: Record<string, string[]> = {
  A: ['H', 'V', 'N', 'M', 'W', 'K', 'R'],
  B: ['D', 'P', 'R', 'E', 'F', 'H', 'K'],
  C: ['G', 'O', 'Q', 'U', 'S', 'D', 'E'],
  D: ['B', 'O', 'P', 'Q', 'R', 'G', 'C'],
  E: ['F', 'B', 'P', 'L', 'H', 'T', 'C'],
  F: ['E', 'P', 'T', 'I', 'L', 'H', 'B'],
  G: ['C', 'Q', 'O', 'S', 'D', 'B', 'U'],
  H: ['M', 'N', 'K', 'A', 'W', 'U', 'R'],
  I: ['J', 'L', 'T', 'F', 'Y', 'U', 'H'],
  J: ['I', 'L', 'T', 'G', 'U', 'Y', 'F'],
  K: ['R', 'H', 'X', 'M', 'N', 'B', 'A'],
  L: ['I', 'J', 'T', 'E', 'F', 'U', 'H'],
  M: ['N', 'W', 'H', 'U', 'A', 'K', 'V'],
  N: ['M', 'H', 'U', 'V', 'W', 'K', 'R'],
  O: ['C', 'G', 'Q', 'D', 'U', 'B', 'S'],
  P: ['B', 'D', 'R', 'F', 'E', 'H', 'K'],
  Q: ['O', 'G', 'C', 'D', 'P', 'U', 'B'],
  R: ['B', 'P', 'K', 'N', 'A', 'D', 'H'],
  S: ['Z', 'C', 'G', 'B', 'O', 'E', 'U'],
  T: ['I', 'F', 'J', 'L', 'Y', 'E', 'H'],
  U: ['V', 'W', 'N', 'M', 'O', 'Y', 'H'],
  V: ['U', 'W', 'Y', 'N', 'M', 'A', 'X'],
  W: ['M', 'V', 'U', 'N', 'H', 'K', 'A'],
  X: ['K', 'Y', 'Z', 'V', 'N', 'T', 'A'],
  Y: ['V', 'X', 'T', 'U', 'J', 'I', 'K'],
  Z: ['S', 'X', 'N', 'E', 'C', 'T', 'A'],
}

// Tiny deterministic shuffle (Lehmer LCG) so foils vary per item but stay reproducible.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 3 distinct, visually-confusable distractors for a target letter, varied by the item's index.
export function foilsFor(letter: string, index: number): string[] {
  const L = (letter || 'A').toUpperCase()
  const pool = (CONFUSABLE[L] ?? ['M', 'N', 'R', 'S', 'T', 'L', 'E', 'O']).filter((c) => c !== L)
  return seededShuffle(pool, index * 31 + L.charCodeAt(0) * 7 + 1).slice(0, 3)
}

export async function buildLetterRecognition(
  vocabulary: string[],
  letters: string | string[],
  activityType: ActivityType = 'hear_and_circle',
  imageMap: Record<string, string> = {}
): Promise<LetterRecognitionContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // One or more focus letters (e.g. the week's letter_week1 + letter_week2). Dedup, uppercase.
  const letterList = Array.from(
    new Set(
      (Array.isArray(letters) ? letters : [letters])
        .map((l) => (l || '').toUpperCase())
        .filter(Boolean)
    )
  )
  const focus = letterList.length ? letterList : ['A']

  const prompt = LETTER_RECOGNITION_PROMPT.replace('{vocabulary}', vocabulary.join(', '))
    .replace('{letter}', focus.join(', '))
    .replace('{activity_type}', activityType)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')
  let parsed: LetterRecognitionContent
  try {
    parsed = JSON.parse(raw) as LetterRecognitionContent
  } catch {
    throw new Error('Respuesta de Claude no es JSON válido')
  }
  // Attach a real visual per item, and OVERRIDE foils in code so the distractors vary per item
  // (not the same 3 every time) while staying visually confusable with the word's real initial.
  parsed.items = (parsed.items ?? []).map((it, i) => {
    const target = (it.target_letter || it.word?.charAt(0) || focus[0]).toUpperCase()
    return {
      ...it,
      target_letter: target,
      foil_letters: foilsFor(target, i),
      emoji: wordToEmoji(it.word) ?? undefined,
      image_url: imageMap[it.word.toLowerCase()],
    }
  })
  return parsed
}
