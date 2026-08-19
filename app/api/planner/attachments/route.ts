import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { PDFDocument } from 'pdf-lib'
import { checkRateLimit } from '@/lib/rate-limit'
import { CLASS_FILES_BUCKET } from '@/lib/files/class-files'

// Extracts the TEXT of a reference file the teacher attached at plan creation. The file was
// uploaded straight to Storage (signed URL — see ./upload-url) so heavy multi-page documents
// don't hit Vercel's ~4.5MB API body cap. Only the extracted text survives: the file itself is
// deleted right after extraction. PDF/images → Claude Haiku transcription; DOCX → mammoth.

export const maxDuration = 300

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50MB upload cap
// Claude's per-request PDF ceiling is 32MB / 100 pages — bigger PDFs get SPLIT by pages
// (pdf-lib) and transcribed part by part.
const CLAUDE_PDF_BYTES = 28 * 1024 * 1024
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
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 50MB).' }, { status: 413 })
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
      const transcribe = async (buf: Buffer, media: string, note = '') => {
        const source =
          media === 'application/pdf'
            ? ({
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: buf.toString('base64'),
                },
              } as unknown as Anthropic.TextBlockParam)
            : ({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: media as 'image/jpeg' | 'image/png' | 'image/webp',
                  data: buf.toString('base64'),
                },
              } as unknown as Anthropic.TextBlockParam)
        const resp = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 4000,
          temperature: 0,
          messages: [
            { role: 'user', content: [source, { type: 'text', text: TRANSCRIBE + note }] },
          ],
        })
        return resp.content[0]?.type === 'text' ? resp.content[0].text : ''
      }

      if (mimeType === 'application/pdf' && buffer.length > CLAUDE_PDF_BYTES) {
        // Heavy scanned PDF: split into page-halves until each part fits Claude's ceiling,
        // transcribe up to 3 parts and stitch. Order preserved; parts beyond 3 are dropped
        // (the prompt cap would truncate them anyway).
        const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
        const total = src.getPageCount()
        const parts: Buffer[] = []
        const queue: [number, number][] = [[0, total]] // [start, end)
        while (queue.length && parts.length < 3) {
          const [a, b] = queue.shift()!
          const doc = await PDFDocument.create()
          const pages = await doc.copyPages(
            src,
            Array.from({ length: b - a }, (_, i) => a + i)
          )
          pages.forEach((pg) => doc.addPage(pg))
          const bytes = Buffer.from(await doc.save())
          if (bytes.length <= CLAUDE_PDF_BYTES || b - a <= 1) parts.push(bytes)
          else {
            const mid = a + Math.ceil((b - a) / 2)
            queue.unshift([mid, b])
            queue.unshift([a, mid])
          }
        }
        const chunks: string[] = []
        for (let i = 0; i < parts.length; i++) {
          chunks.push(
            await transcribe(parts[i], 'application/pdf', ` (parte ${i + 1} de ${parts.length})`)
          )
        }
        text = chunks.join('\n')
      } else {
        text = await transcribe(buffer, mimeType)
      }
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
