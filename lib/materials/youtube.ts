// lib/materials/youtube.ts
// Call assertYoutubePublic(url) before any transcript fetch to enforce the
// "solo videos públicos" policy (Aviso de Privacidad, Sección VII).
import Anthropic from '@anthropic-ai/sdk'
import { YOUTUBE_PROMPT } from '@/prompts/materials'
import type { FortnightContext } from './types'

export async function assertYoutubePublic(url: string): Promise<void> {
  const oEmbed = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  )
  if (!oEmbed.ok) {
    throw new Error(
      'Este video es privado o no está disponible. Solo se pueden procesar videos públicos.'
    )
  }
}

export type YoutubeVideo = {
  title: string
  channel: string
  duration: string
  description: string
  keywords: string[]
  has_subtitles?: boolean
  verified?: boolean
  // A YouTube SEARCH url (these are AI recommendations, not verified video ids) — always present
  // so the teacher can open and pick the real video. Derived from title+channel if absent.
  search_url?: string
}

function youtubeSearchUrl(title: string, channel: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${channel}`.trim())}`
}

export type YoutubeContent = {
  videos: YoutubeVideo[]
}

export async function buildYoutubeRecommendations(
  vocabulary: string[],
  context: FortnightContext | string
): Promise<YoutubeContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const projectTheme = typeof context === 'string' ? context : context.project_name
  const contextBlock =
    typeof context === 'string'
      ? ''
      : context.richmond_unit
        ? `Unidad Richmond: ${context.richmond_unit}\n`
        : ''

  const userMessage = `Vocabulario del tema:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Tema del proyecto: ${projectTheme}
${contextBlock}
Recomienda videos educativos de YouTube apropiados para este vocabulario y tema.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0.3,
    system: YOUTUBE_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')
  let parsed: YoutubeContent
  try {
    parsed = JSON.parse(raw) as YoutubeContent
  } catch {
    throw new Error('Respuesta de Claude no es JSON válido')
  }
  // Guarantee a working (search) link for every recommendation.
  parsed.videos = (parsed.videos ?? []).map((v) => ({
    ...v,
    search_url: v.search_url || youtubeSearchUrl(v.title, v.channel),
  }))
  return parsed
}
