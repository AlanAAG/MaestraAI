import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 120

import { checkRateLimit } from '@/lib/rate-limit'
import { assertYoutubePublic } from '@/lib/materials/youtube'
import { classifyYoutubeTranscript } from '@/lib/materials/youtube-classify'
import { buildSongWorksheet } from '@/lib/materials/song-worksheet'
import { buildLetterRecognition } from '@/lib/materials/letter-recognition'
import { buildFlashcardContent } from '@/lib/materials/flashcards'
import { YoutubeTranscript } from 'youtube-transcript'

function extractVideoId(url: string): string | null {
  return url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1] ?? null
}

// Primary: YouTube's internal "innertube" player API (the same one youtube.com uses) with the
// ANDROID client — returns the caption track list far more reliably than scraping the watch page,
// and the web innertube key below is public (shipped in every YouTube page), not a secret.
// ponytail: still hits YouTube from Vercel IPs — if they hard-block the datacenter, the upgrade path
// is a paid transcript service (Supadata/Tactiq) since the Data API can't download arbitrary captions.
/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchCaptionsInnertube(videoId: string): Promise<string | null> {
  const res = await fetch(
    'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '19.09.37',
            androidSdkVersion: 30,
            hl: 'en',
          },
        },
      }),
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  const tracks: any[] = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
  if (!tracks.length) return null
  const track =
    tracks.find((t) => t.languageCode?.startsWith('en')) ??
    tracks.find((t) => t.languageCode?.startsWith('es')) ??
    tracks[0]
  const tt = await fetch(`${track.baseUrl}&fmt=json3`)
  if (!tt.ok) return null
  const json = await tt.json()
  const text: string = (json.events ?? [])
    .flatMap((e: any) => (e.segs ?? []).map((s: any) => s.utf8 ?? ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Innertube first, then the youtube-transcript scraper (en/es) as a fallback.
async function fetchTranscriptRobust(url: string): Promise<Array<{ text: string }>> {
  const id = extractVideoId(url)
  if (id) {
    const viaInnertube = await fetchCaptionsInnertube(id).catch(() => null)
    if (viaInnertube) return [{ text: viaInnertube }]
  }
  const attempts: Array<{ lang?: string } | undefined> = [undefined, { lang: 'en' }, { lang: 'es' }]
  let lastErr: unknown
  for (const cfg of attempts) {
    try {
      const segs = await YoutubeTranscript.fetchTranscript(url, cfg)
      if (segs?.length) return segs
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('No transcript segments')
}

const Schema = z.object({
  url: z.string().url(),
  fortnight_id: z.string().uuid(),
  lesson_plan_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'strict')
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { url, fortnight_id, lesson_plan_id } = parsed.data

  // Verify fortnight belongs to this teacher (prevents IDOR)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fortnightRecord } = await (supabase as any)
    .from('fortnights')
    .select('teacher_id')
    .eq('id', fortnight_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!fortnightRecord || (fortnightRecord as any).teacher_id !== (teacher as any).id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  // 1. Validate the video is public
  try {
    await assertYoutubePublic(url)
  } catch {
    return NextResponse.json(
      { error: 'Este video no está disponible o no es público.' },
      { status: 400 }
    )
  }

  // 2. Fetch transcript
  let transcriptSegments: Array<{ text: string }>
  try {
    transcriptSegments = await fetchTranscriptRobust(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[from-youtube] transcript fetch failed:', msg)
    // Distinguish "this video has no captions" from "YouTube is blocking the fetch" so the teacher
    // gets an honest message instead of always being told the video has no subtitles.
    const noCaptions = /disabled|no transcript|not available|unavailable|could not find/i.test(msg)
    return NextResponse.json(
      {
        error: noCaptions
          ? 'Este video no tiene subtítulos disponibles. Prueba con uno que muestre el ícono "CC" en YouTube.'
          : 'No pude leer los subtítulos en este momento (YouTube los está bloqueando). Intenta de nuevo en unos minutos o prueba con otro video.',
      },
      { status: 422 }
    )
  }
  const transcript = transcriptSegments.map((s) => s.text).join(' ')

  // 3. Classify the video
  let classification
  try {
    classification = await classifyYoutubeTranscript(transcript)
  } catch {
    return NextResponse.json({ error: 'Error al clasificar el video' }, { status: 500 })
  }

  const { type: videoType, key_vocabulary, song_title, confidence } = classification

  if (!key_vocabulary || key_vocabulary.length === 0) {
    return NextResponse.json(
      { error: 'No se detectó vocabulario útil en este video.' },
      { status: 422 }
    )
  }
  if (confidence < 0.5) {
    return NextResponse.json(
      { error: 'No pudimos clasificar este video claramente. Intenta con otro.' },
      { status: 422 }
    )
  }

  // 4. Generate appropriate materials
  const createdIds: string[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function saveMaterial(materialType: string, content: unknown, isProjectable: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('materials')
      .insert({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        teacher_id: (teacher as any).id,
        fortnight_id,
        lesson_plan_id: lesson_plan_id || null,
        type: materialType,
        content,
        vocabulary: key_vocabulary,
        is_projectable: isProjectable,
        source_url: url,
        video_type: videoType,
        source_transcript: transcript.slice(0, 5000),
      })
      .select('id')
      .single()
    if (!error && data) createdIds.push(data.id)
  }

  try {
    if (videoType === 'song') {
      const worksheet = await buildSongWorksheet(transcript, song_title || '', key_vocabulary)
      await saveMaterial('song_worksheet', worksheet, false)
    } else if (videoType === 'lesson') {
      const flashcards = await buildFlashcardContent(key_vocabulary)
      await saveMaterial('flashcards', flashcards, true)
      const letterRec = await buildLetterRecognition(
        key_vocabulary,
        key_vocabulary[0]?.charAt(0).toUpperCase() || 'A',
        'hear_and_circle'
      )
      await saveMaterial('letter_recognition', letterRec, false)
    } else {
      // story | other → flashcards only
      const flashcards = await buildFlashcardContent(key_vocabulary)
      await saveMaterial('flashcards', flashcards, true)
    }
  } catch (err) {
    console.error('Material generation error:', err)
    return NextResponse.json({ error: 'Error al generar materiales' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, material_ids: createdIds, video_type: videoType })
}
