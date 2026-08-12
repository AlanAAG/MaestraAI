import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { checkRateLimit } from '@/lib/rate-limit'

// Extracts the TEXT of a reference file the teacher attaches at plan creation. The extracted
// text (never the file) is stored on the fortnight and injected into the generation prompt.
// PDF/images → Claude Haiku transcription; DOCX → mammoth; TXT → decode. Capped hard.

export const maxDuration = 60

const MAX_BYTES = 8 * 1024 * 1024 // 8MB base64 payload guard
const MAX_TEXT = 6000

const Schema = z.object({
  name: z.string().trim().min(1).max(120),
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
  base64: z.string().min(1),
})

const TRANSCRIBE =
  'Transcribe el contenido de este documento de forma fiel y completa (texto, listas, fechas, páginas, vocabulario). Si hay tablas, escríbelas como listas. Responde SOLO con el contenido transcrito, sin comentarios.'

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Archivo no soportado' }, { status: 400 })
    if (body.data.base64.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 6MB).' }, { status: 413 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'strict', 'plan-attachments')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    const { name, mimeType, base64 } = body.data
    let text = ''

    if (mimeType === 'text/plain') {
      text = Buffer.from(base64, 'base64').toString('utf8')
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(base64, 'base64') })
      text = value ?? ''
    } else {
      // PDF or image → Claude Haiku transcription (native document/vision support, no extra deps).
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'Extracción no disponible.' }, { status: 503 })
      }
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const source =
        mimeType === 'application/pdf'
          ? ({
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as unknown as Anthropic.TextBlockParam)
          : ({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: base64,
              },
            } as unknown as Anthropic.TextBlockParam)
      const resp = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 3000,
        temperature: 0,
        messages: [{ role: 'user', content: [source, { type: 'text', text: TRANSCRIBE }] }],
      })
      text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
    }

    text = text.trim()
    if (text.length < 20) {
      return NextResponse.json(
        { error: 'No pude leer texto útil de ese archivo.' },
        { status: 422 }
      )
    }
    return NextResponse.json({ name, text: text.slice(0, MAX_TEXT) })
  } catch (err) {
    console.error('[plan-attachments]', err)
    return NextResponse.json({ error: 'No pude procesar el archivo.' }, { status: 500 })
  }
}
