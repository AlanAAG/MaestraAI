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

type Teacher = { id: string; school_id: string | null; role_type: string | null }

async function getTeacher(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('teachers')
    .select('id, school_id, role_type')
    .eq('auth_id', userId)
    .single()
  return data as Teacher | null
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
  // RLS returns the teacher's own templates PLUS any shared with their school — no teacher_id
  // filter here. The owner's name is joined so shared rows can show who created them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('teacher_plan_templates')
    .select(
      'id, label, plan_type, template, created_at, teacher_id, shared_with_school, is_school_official, teachers(full_name)'
    )
    .order('created_at', { ascending: false })
  if (plan_type) query = query.eq('plan_type', plan_type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates = ((data ?? []) as any[])
    .map((t) => ({
      id: t.id,
      label: t.label,
      plan_type: t.plan_type,
      template: t.template,
      created_at: t.created_at,
      is_owner: t.teacher_id === teacher.id,
      shared_with_school: !!t.shared_with_school,
      is_school_official: !!t.is_school_official,
      owner_name: t.teachers?.full_name ?? null,
    }))
    // Own formats first, then most recent.
    .sort(
      (a, b) => Number(b.is_owner) - Number(a.is_owner) || (a.created_at < b.created_at ? 1 : -1)
    )

  return NextResponse.json({ templates, is_admin: teacher.role_type === 'admin' })
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

    // Cap at 5 visible formats (own + shared with the teacher's school — no teacher_id filter so
    // RLS counts both, per the chosen sharing model).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('teacher_plan_templates')
      .select('id', { count: 'exact', head: true })
    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Máximo 5 formatos (propios + compartidos). Elimina uno antes de agregar otro.' },
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
      .insert({ teacher_id: teacher.id, label, plan_type, template, school_id: teacher.school_id })
      .select('id, label, plan_type, created_at')
      .single()
    if (error) throw error

    return NextResponse.json({ template_record: data })
  } catch (err) {
    console.error('POST /api/teachers/templates error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  shared_with_school: z.boolean().optional(),
  is_school_official: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacher = await getTeacher(supabase, user.id)
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const { id, shared_with_school, is_school_official } = parsed.data

  const patch: Record<string, unknown> = {}
  if (shared_with_school !== undefined) {
    patch.shared_with_school = shared_with_school
    if (shared_with_school) patch.school_id = teacher.school_id // ensure set when sharing
  }
  if (is_school_official !== undefined) {
    // Only admins can mark a format as the official school format.
    if (teacher.role_type !== 'admin') {
      return NextResponse.json(
        { error: 'Solo un administrador puede marcar el formato oficial de la escuela.' },
        { status: 403 }
      )
    }
    patch.is_school_official = is_school_official
  }
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  // Own templates only (RLS + explicit teacher_id guard).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('teacher_plan_templates')
    .update(patch)
    .eq('id', id)
    .eq('teacher_id', teacher.id)
    .select('id, shared_with_school, is_school_official')
    .single()
  if (error || !data) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 404 })

  return NextResponse.json({ ok: true, ...data })
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
