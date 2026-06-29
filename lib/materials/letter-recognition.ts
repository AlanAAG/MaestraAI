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

export async function buildLetterRecognition(
  vocabulary: string[],
  letter: string,
  activityType: ActivityType = 'hear_and_circle',
  imageMap: Record<string, string> = {}
): Promise<LetterRecognitionContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = LETTER_RECOGNITION_PROMPT.replace('{vocabulary}', vocabulary.join(', '))
    .replace('{letter}', letter.toUpperCase())
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
  // Attach a real visual per item (deterministic emoji + optional fetched image) so the activity
  // shows pictures, not just the distractor letters.
  parsed.items = (parsed.items ?? []).map((it) => ({
    ...it,
    emoji: wordToEmoji(it.word) ?? undefined,
    image_url: imageMap[it.word.toLowerCase()],
  }))
  return parsed
}
