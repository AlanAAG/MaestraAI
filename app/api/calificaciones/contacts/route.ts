import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate-limit'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'] as const

const ExtractSchema = z
  .object({
    pasteText: z.string().min(5).max(5000).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.enum(IMAGE_TYPES).optional(),
  })
  .refine((d) => d.pasteText || d.imageBase64, { message: 'Provide pasteText or imageBase64' })

const SaveSchema = z.object({
  group_id: z.string().uuid(),
  contacts: z.array(
    z.object({
      richmond_student_id: z.string().min(1),
      student_first_name: z.string().optional(),
      student_last_name: z.string().optional(),
      parent_name: z.string().optional(),
      parent_email: z.string().email(),
    })
  ),
})

const EXTRACT_SYSTEM = `Eres un asistente que extrae listas de contactos de padres de familia a partir de texto o imágenes.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{"contacts":[{"student_name":"Nombre Apellido","parent_name":"Nombre del padre/madre","parent_email":"correo@ejemplo.com"}]}
- Ignora filas sin correo electrónico válido
- student_name puede ser solo el nombre, solo apellido, o nombre completo — extrae lo que haya
- Si no encuentras ningún correo, responde: {"contacts":[]}`

async function auth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { success, headers } = await checkRateLimit(user.id, 'standard')
  if (!success)
    return {
      error: NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers }),
    }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  return { supabase, teacher }
}

// POST /api/calificaciones/contacts?action=extract|save
export async function POST(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action') ?? 'save'

  const ctx = await auth()
  if (ctx.error) return ctx.error
  const { supabase, teacher } = ctx

  const body = await req.json()

  if (action === 'extract') {
    const parsed = ExtractSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const { pasteText, imageBase64, imageMimeType } = parsed.data
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
            { type: 'text', text: 'Extrae la lista de contactos de padres de esta imagen.' },
          ]
        : `Lista de contactos:\n${pasteText}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      temperature: 0,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    try {
      const result = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
      return NextResponse.json(result)
    } catch {
      return NextResponse.json({ error: 'No pude extraer contactos del texto.' }, { status: 422 })
    }
  }

  // action === 'save'
  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { group_id, contacts } = parsed.data
  const rows = contacts.map((c) => ({
    teacher_id: teacher.id,
    group_id,
    richmond_student_id: c.richmond_student_id,
    student_first_name: c.student_first_name ?? null,
    student_last_name: c.student_last_name ?? null,
    parent_name: c.parent_name ?? null,
    parent_email: c.parent_email,
    updated_at: new Date().toISOString(),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('parent_contacts')
    .upsert(rows, { onConflict: 'teacher_id,richmond_student_id' })

  if (error) {
    console.error('Contacts upsert error:', error)
    return NextResponse.json({ error: 'No se pudieron guardar los contactos.' }, { status: 500 })
  }

  return NextResponse.json({ saved: rows.length })
}

// GET /api/calificaciones/contacts?group_id=...
export async function GET(req: NextRequest) {
  const ctx = await auth()
  if (ctx.error) return ctx.error
  const { supabase, teacher } = ctx

  const group_id = new URL(req.url).searchParams.get('group_id')
  if (!group_id) return NextResponse.json({ error: 'Missing group_id' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('parent_contacts')
    .select('*')
    .eq('teacher_id', teacher.id)
    .eq('group_id', group_id)
    .order('student_last_name')

  if (error) return NextResponse.json({ error: 'Error loading contacts.' }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] })
}

// DELETE /api/calificaciones/contacts?id=...
export async function DELETE(req: NextRequest) {
  const ctx = await auth()
  if (ctx.error) return ctx.error
  const { supabase, teacher } = ctx

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('parent_contacts').delete().eq('id', id).eq('teacher_id', teacher.id)

  return NextResponse.json({ success: true })
}
