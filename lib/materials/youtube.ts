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
  // Real video resolved from YouTube search (when found) → opens the specific video, not a search.
  video_id?: string
  url?: string
  // Fallback YouTube SEARCH url (used only if the recommendation couldn't be resolved to a real id).
  search_url?: string
}

function youtubeSearchUrl(title: string, channel: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${channel}`.trim())}`
}

// Public web "innertube" key (shipped in every youtube.com page, not a secret) — the same key the
// caption fetch uses (app/api/materials/from-youtube). Lets us search YouTube without a Data API
// key/quota and resolve an AI recommendation to a REAL video id.
// ponytail: hits YouTube from server IPs like the caption path; if datacenter IPs get blocked, the
// upgrade path is the YouTube Data API (needs a key + quota). Falls back to search_url on any failure.
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

type ResolvedVideo = { video_id: string; title: string; channel: string; duration: string }

/** Resolve a free-text query to the top real YouTube video (or null). Best-effort, never throws. */
export async function searchYoutube(query: string): Promise<ResolvedVideo | null> {
  if (!query.trim()) return null
  try {
    const res = await fetch(`https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        context: {
          client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'es', gl: 'MX' },
        },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: any[] =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents ?? []
    for (const sec of sections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of sec?.itemSectionRenderer?.contents ?? []) {
        const vr = item?.videoRenderer
        if (vr?.videoId) {
          return {
            video_id: vr.videoId,
            title: vr.title?.runs?.[0]?.text ?? '',
            channel: vr.ownerText?.runs?.[0]?.text ?? vr.longBylineText?.runs?.[0]?.text ?? '',
            duration: vr.lengthText?.simpleText ?? '',
          }
        }
      }
    }
    return null
  } catch {
    return null
  }
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
  // Resolve each AI recommendation to a REAL YouTube video so the link opens that specific video
  // (not a search page). Best-effort + parallel; falls back to a search url if not resolved. When
  // resolved, show the real title/channel/duration so the card matches the video it opens.
  parsed.videos = await Promise.all(
    (parsed.videos ?? []).map(async (v) => {
      const real = await searchYoutube(`${v.title} ${v.channel}`.trim())
      if (real?.video_id) {
        return {
          ...v,
          video_id: real.video_id,
          url: `https://www.youtube.com/watch?v=${real.video_id}`,
          title: real.title || v.title,
          channel: real.channel || v.channel,
          duration: real.duration || v.duration,
          search_url: youtubeSearchUrl(v.title, v.channel),
        }
      }
      return { ...v, search_url: youtubeSearchUrl(v.title, v.channel) }
    })
  )
  return parsed
}
