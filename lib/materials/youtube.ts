// lib/materials/youtube.ts
import Anthropic from '@anthropic-ai/sdk'
import { YOUTUBE_PROMPT } from '@/prompts/materials'

export type YoutubeVideo = {
  title: string
  channel: string
  duration: string
  description: string
  keywords: string[]
}

export type YoutubeContent = {
  videos: YoutubeVideo[]
}

export async function buildYoutubeRecommendations(
  vocabulary: string[],
  projectTheme: string
): Promise<YoutubeContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userMessage = `
Vocabulario del tema:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Tema del proyecto: ${projectTheme}

Recomienda videos educativos de YouTube apropiados para este vocabulario y tema.
`.trim()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    temperature: 0.7,
    system: YOUTUBE_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0]) as YoutubeContent
  } catch {
    console.error('Failed to parse YouTube response:', content.text)
    throw new Error('Failed to parse YouTube content')
  }
}
