import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateBase64Image } from '@/lib/file-validation'
import { checkRateLimit } from '@/lib/rate-limit'

const Schema = z
  .object({
    template_text: z.string().min(50).max(5000).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.enum(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']).optional(),
  })
  .refine((d) => d.template_text || d.imageBase64, {
    message: 'Provide template_text or imageBase64',
  })

const SYSTEM = `Analiza este formato de planeación escolar y extrae su estructura. Responde ÚNICAMENTE con JSON válido, sin texto adicional:

{"sections":["sección 1","sección 2"],"notes":"estilo y convenciones breves (máx 100 chars)"}`

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

    const { template_text, imageBase64, imageMimeType } = body.data

    if (imageBase64 && imageMimeType) {
      const validation = await validateBase64Image(imageBase64, imageMimeType)
      if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const userContent: Anthropic.MessageParam['content'] =
      imageBase64 && imageMimeType
        ? [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMimeType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Analiza este formato de planeación escolar de la imagen y extrae su estructura en el JSON indicado.',
            },
          ]
        : `Formato de planeación:\n---\n${template_text}\n---`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    let parsed: { sections?: string[]; notes?: string }
    try {
      parsed = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    } catch {
      return NextResponse.json(
        { error: 'No pude analizar el formato. Intenta con más texto o una foto más clara.' },
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
