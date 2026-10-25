import { OPENAI_MODELS } from '@/lib/ai/models'
import OpenAIProvider from '@/lib/ai/openai-provider'
import { SONG_WORKSHEET_PROMPT } from '@/prompts/materials'

export type LyricLineOption = {
  word: string
  image_description: string
  correct: boolean
}

export type LyricLine = {
  text: string
  missing_word: string
  options: LyricLineOption[]
}

export type SongWorksheetContent = {
  lyric_worksheet: {
    title: string
    lines: LyricLine[]
  }
  tpr_guide: Array<{ word: string; gesture: string }>
  vocab_cards: Array<{ word: string; image_description: string }>
}

export async function buildSongWorksheet(
  transcript: string,
  songTitle: string,
  keyVocabulary: string[]
): Promise<SongWorksheetContent> {
  const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = SONG_WORKSHEET_PROMPT.replace('{transcript}', transcript.slice(0, 4000))
    .replace('{song_title}', songTitle || 'Unknown')
    .replace('{key_vocabulary}', keyVocabulary.join(', '))

  const response = await provider.messages.create({
    jsonMode: true,
    model: OPENAI_MODELS.routine,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from OpenAI')

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('La IA no devolvió JSON válido')
  try {
    return JSON.parse(raw) as SongWorksheetContent
  } catch {
    throw new Error('La respuesta de la IA no es JSON válido')
  }
}
