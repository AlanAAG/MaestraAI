import { OPENAI_MODELS } from '@/lib/ai/models'
import OpenAIProvider from '@/lib/ai/openai-provider'
import { YOUTUBE_CLASSIFIER_PROMPT } from '@/prompts/materials'

export type VideoType = 'song' | 'lesson' | 'story' | 'other'

export type ClassificationResult = {
  type: VideoType
  confidence: number
  key_vocabulary: string[]
  song_title: string | null
}

export async function classifyYoutubeTranscript(transcript: string): Promise<ClassificationResult> {
  const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })

  const response = await provider.messages.create({
    jsonMode: true,
    model: OPENAI_MODELS.routine,
    max_tokens: 512,
    system: YOUTUBE_CLASSIFIER_PROMPT,
    messages: [{ role: 'user', content: transcript.slice(0, 3000) }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from OpenAI')

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('La IA no devolvió JSON válido')
  try {
    return JSON.parse(raw) as ClassificationResult
  } catch {
    throw new Error('La respuesta de la IA no es JSON válido')
  }
}
