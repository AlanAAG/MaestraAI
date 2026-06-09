import Anthropic from '@anthropic-ai/sdk'
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
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = SONG_WORKSHEET_PROMPT.replace('{transcript}', transcript.slice(0, 4000))
    .replace('{song_title}', songTitle || 'Unknown')
    .replace('{key_vocabulary}', keyVocabulary.join(', '))

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')
  try {
    return JSON.parse(raw) as SongWorksheetContent
  } catch {
    throw new Error('Respuesta de Claude no es JSON válido')
  }
}
