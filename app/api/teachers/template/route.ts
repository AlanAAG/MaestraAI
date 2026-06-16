import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateBase64Image } from '@/lib/file-validation'
import { checkRateLimit } from '@/lib/rate-limit'
import mammoth from 'mammoth'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'] as const
const DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const

const Schema = z
  .object({
    imageBase64: z.string().optional(),
    imageMimeType: z.enum(IMAGE_TYPES).optional(),
    documentBase64: z.string().optional(),
    documentMimeType: z.string().optional(),
  })
  .refine((d) => d.imageBase64 || d.documentBase64, {
    message: 'Provide imageBase64 or documentBase64',
  })

const SYSTEM = `Analiza este formato de planeación escolar. Responde ÚNICAMENTE con JSON válido, sin texto adicional:

{"sections":["sección 1","sección 2"],"notes":"estilo y convenciones breves (máx 80 chars)","examples":["fragmento verbatim de una actividad real del formato","otro fragmento"]}

Reglas:
- sections: nombres exactos de las secciones del formato
- notes: tono, nivel de detalle, convenciones (máx 80 chars)
- examples: 2-3 fragmentos de descripciones de actividades copiados LITERALMENTE del formato (máx 120 chars c/u). Omite si no hay actividades específicas.`

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'strict')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { imageBase64, imageMimeType, documentBase64, documentMimeType } = body.data

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    let userContent: Anthropic.MessageParam['content']

    if (imageBase64 && imageMimeType) {
      // Image path — Claude Vision
      const validation = await validateBase64Image(imageBase64, imageMimeType)
      if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })

      userContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: 'Analiza este formato de planeación escolar de la imagen y extrae su estructura en el JSON indicado.',
        },
      ]
    } else if (documentBase64 && documentMimeType) {
      if (
        documentMimeType ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ) {
        return NextResponse.json(
          { error: 'Por favor convierte tu presentación a PDF antes de subir.' },
          { status: 422 }
        )
      }

      if (documentMimeType === 'application/pdf') {
        // PDF path — Claude document API (native PDF support, zero extra deps)
        userContent = [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: documentBase64,
            },
          } as unknown as Anthropic.TextBlockParam,
          {
            type: 'text',
            text: 'Analiza este formato de planeación escolar y extrae su estructura en el JSON indicado.',
          },
        ]
      } else if (DOC_TYPES.includes(documentMimeType as (typeof DOC_TYPES)[number])) {
        // DOCX path — extract text via mammoth, send as text
        const buffer = Buffer.from(documentBase64, 'base64')
        const { value: docText } = await mammoth.extractRawText({ buffer })
        if (!docText || docText.trim().length < 50) {
          return NextResponse.json(
            { error: 'El documento no tiene suficiente texto para analizar.' },
            { status: 422 }
          )
        }
        userContent = `Formato de planeación:\n---\n${docText.slice(0, 4000)}\n---`
      } else {
        return NextResponse.json(
          { error: 'Formato no soportado. Sube una imagen, PDF o archivo Word.' },
          { status: 422 }
        )
      }
    } else {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    let parsed: { sections?: string[]; notes?: string; examples?: string[] }
    try {
      parsed = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    } catch {
      return NextResponse.json(
        { error: 'No pude analizar el formato. Intenta con una imagen o documento más claro.' },
        { status: 422 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('teachers')
      .update({ plan_template: parsed })
      .eq('id', teacher.id)
    if (error) throw error

    return NextResponse.json({ plan_template: parsed })
  } catch (err) {
    console.error('POST /api/teachers/template error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
