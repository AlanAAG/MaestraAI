import Anthropic from '@anthropic-ai/sdk'
import { YOUTUBE_CLASSIFIER_PROMPT } from '@/prompts/materials'

export type VideoType = 'song' | 'lesson' | 'story' | 'other'

export type ClassificationResult = {
  type: VideoType
  confidence: number
  key_vocabulary: string[]
  song_title: string | null
}

export async function classifyYoutubeTranscript(transcript: string): Promise<ClassificationResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    temperature: 0,
    system: YOUTUBE_CLASSIFIER_PROMPT,
    messages: [{ role: 'user', content: transcript.slice(0, 3000) }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')
  try {
    return JSON.parse(raw) as ClassificationResult
  } catch {
    throw new Error('Respuesta de Claude no es JSON válido')
  }
}
