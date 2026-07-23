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

// Bounce Patrol "The Letter X Song - Learn the Alphabet" — one per letter, always recommended
// for the fortnight's focus letters. Ids resolved + title/channel-verified via innertube search
// (2026-07); Z is the US "Zee" version.
// ponytail: baked ids are NOT liveness-checked at generation — if Bounce Patrol removes a video,
// re-resolve it (scripts in git history / searchYoutube) and update this map.
const BOUNCE_PATROL_CHANNEL = 'Bounce Patrol - Kids Songs'
const BOUNCE_PATROL_LETTER_SONGS: Record<string, string> = {
  A: 'gsb999VSvh8',
  B: 'kzzXROKd-i0',
  C: '1dhzPuT6jm0',
  D: 'nb8DqaQmNWg',
  E: 'beaUUPPUT2Y',
  F: 'gVJQL1E7BFQ',
  G: '0KXtxIiQ7gk',
  H: 'NtUSMBzacQ0',
  I: 'P56hZEhqFCw',
  J: '6KXX6fCKWes',
  K: 'OGVbUgqp7LQ',
  L: 'qEXMoeYe47c',
  M: 'Nvn9QvV7Aqk',
  N: 'qE5HEeoVGb0',
  O: 'oWbY5EKys60',
  P: '-v1fg2Hp63s',
  Q: 'NKAookrRV4s',
  R: 'gUSJeivdEH8',
  S: 'uSVzk2pqWB4',
  T: 'HHEqOLZ0hr4',
  U: 'nPJRhEV-kF8',
  V: 'PA47cP88ySw',
  W: 'MbUIYnDZZ-M',
  X: 'RX9Pm9qj_QY',
  Y: 'L8PdL8ydI28',
  Z: 'HysVxhemAe4',
}

/** One Bounce Patrol letter-song entry per focus letter (dedup, A-Z only). Pure map lookup. */
export function bouncePatrolLetterVideos(letters: string[]): YoutubeVideo[] {
  const unique = Array.from(new Set(letters.map((l) => l.trim().charAt(0).toUpperCase()))).filter(
    (l) => /^[A-Z]$/.test(l)
  )
  return unique.map((l) => {
    const videoId = BOUNCE_PATROL_LETTER_SONGS[l]
    return {
      title: `The Letter ${l} Song - Learn the Alphabet`,
      channel: BOUNCE_PATROL_CHANNEL,
      duration: '',
      description: `Canción de la letra ${l} para aprender el abecedario en inglés.`,
      keywords: ['alphabet', `letter ${l}`, 'phonics'],
      verified: true,
      video_id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    }
  })
}

export async function buildYoutubeRecommendations(
  vocabulary: string[],
  context: FortnightContext | string,
  letters: string[] = []
): Promise<YoutubeContent> {
  // The letter songs need no model call — if the AI recommendation step fails (usage cap,
  // malformed JSON), still deliver them instead of failing the whole material.
  const letterVideos = bouncePatrolLetterVideos(letters)
  try {
    return await aiRecommendations(vocabulary, context, letterVideos)
  } catch (err) {
    if (letterVideos.length === 0) throw err
    console.error('[youtube] AI recommendations failed, returning letter songs only:', err)
    return { videos: letterVideos }
  }
}

async function aiRecommendations(
  vocabulary: string[],
  context: FortnightContext | string,
  letterVideos: YoutubeVideo[]
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
  // The fortnight's letter songs (Bounce Patrol) always come first; drop AI picks of the same videos.
  const letterIds = new Set(letterVideos.map((v) => v.video_id).filter(Boolean))
  parsed.videos = [
    ...letterVideos,
    ...parsed.videos.filter((v) => !v.video_id || !letterIds.has(v.video_id)),
  ]
  return parsed
}
