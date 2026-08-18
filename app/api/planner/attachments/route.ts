import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { checkRateLimit } from '@/lib/rate-limit'
import { CLASS_FILES_BUCKET } from '@/lib/files/class-files'

// Extracts the TEXT of a reference file the teacher attached at plan creation. The file was
// uploaded straight to Storage (signed URL — see ./upload-url) so heavy multi-page documents
// don't hit Vercel's ~4.5MB API body cap. Only the extracted text survives: the file itself is
// deleted right after extraction. PDF/images → Claude Haiku transcription; DOCX → mammoth.

export const maxDuration = 120

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25MB — Claude's PDF ceiling is 32MB/100 pages
const MAX_TEXT = 9000

const Schema = z.object({
  name: z.string().trim().min(1).max(160),
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
  path: z.string().min(1).max(300),
})

const TRANSCRIBE =
  'Transcribe el contenido de este documento de forma fiel (texto, listas, fechas, páginas, vocabulario). Si hay tablas, escríbelas como listas. Si es muy largo, prioriza: temas, fechas, indicaciones y vocabulario. Responde SOLO con el contenido transcrito, sin comentarios.'

export async function POST(req: NextRequest) {
  const service = createServiceClient()
  let path = ''
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Archivo no soportado' }, { status: 400 })
    path = body.data.path

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'strict', 'plan-attachments')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    // The path must be THIS teacher's own upload prefix (pa/<teacherId>/…).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher || !path.startsWith(`pa/${teacher.id}/`)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data: blob, error: dlErr } = await service.storage
      .from(CLASS_FILES_BUCKET)
      .download(path)
    if (dlErr || !blob) {
      return NextResponse.json({ error: 'No encontré el archivo subido.' }, { status: 404 })
    }
    const buffer = Buffer.from(await blob.arrayBuffer())
    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 25MB).' }, { status: 413 })
    }

    const { name, mimeType } = body.data
    let text = ''
    if (mimeType === 'text/plain') {
      text = buffer.toString('utf8')
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const { value } = await mammoth.extractRawText({ buffer })
      text = value ?? ''
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'Extracción no disponible.' }, { status: 503 })
      }
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const base64 = buffer.toString('base64')
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
        max_tokens: 4000,
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
  } finally {
    // Only the extracted text survives — the uploaded file is temporary by design.
    if (path) {
      service.storage
        .from(CLASS_FILES_BUCKET)
        .remove([path])
        .catch(() => {})
    }
  }
}
