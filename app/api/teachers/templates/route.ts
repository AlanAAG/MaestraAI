import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { extractTemplate } from '@/lib/planner/extract-template'

// Claude extraction of a full document (verbatim PDAs + voice + formatting rules) can take a
// while — give it room so the function isn't killed mid-extraction (the default is far too short).
export const maxDuration = 120

const PostSchema = z
  .object({
    label: z.string().min(1).max(80),
    plan_type: z.enum(['quincena', 'taller']).default('quincena'),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
    documentBase64: z.string().optional(),
    documentMimeType: z.string().optional(),
  })
  .refine((d) => d.imageBase64 || d.documentBase64, {
    message: 'Provide imageBase64 or documentBase64',
  })

async function getTeacher(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', userId)
    .single()
  return data as { id: string } | null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacher = await getTeacher(supabase, user.id)
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan_type = req.nextUrl.searchParams.get('plan_type')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('teacher_plan_templates')
    .select('id, label, plan_type, template, created_at')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  if (plan_type) query = query.eq('plan_type', plan_type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = PostSchema.safeParse(await req.json())
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

    const teacher = await getTeacher(supabase, user.id)
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Cap at 5 templates per teacher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('teacher_plan_templates')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Máximo 5 formatos guardados. Elimina uno antes de agregar otro.' },
        { status: 422 }
      )
    }

    const { label, plan_type, ...fileInput } = body.data
    let template
    try {
      template = await extractTemplate(fileInput)
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Error al analizar el formato' },
        { status: 422 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('teacher_plan_templates')
      .insert({ teacher_id: teacher.id, label, plan_type, template })
      .select('id, label, plan_type, created_at')
      .single()
    if (error) throw error

    return NextResponse.json({ template_record: data })
  } catch (err) {
    console.error('POST /api/teachers/templates error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacher = await getTeacher(supabase, user.id)
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('teacher_plan_templates')
    .delete()
    .eq('id', id)
    .eq('teacher_id', teacher.id)
  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
