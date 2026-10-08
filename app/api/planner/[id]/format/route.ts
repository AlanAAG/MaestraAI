import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const Schema = z.object({ template_id: z.string().uuid().nullable() })

// Choose the exact school format for this plan before generating or regenerating it.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: teacher } = await db.from('teachers').select('id').eq('auth_id', user.id).single()
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: plan } = await db
    .from('fortnights')
    .select('id, plan_type')
    .eq('id', params.id)
    .eq('teacher_id', teacher.id)
    .single()
  if (!plan) return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 })
  if (parsed.data.template_id) {
    const { data: template } = await db
      .from('teacher_plan_templates')
      .select('id')
      .eq('id', parsed.data.template_id)
      .eq('plan_type', plan.plan_type === 'mes' ? 'quincena' : plan.plan_type)
      .single()
    if (!template)
      return NextResponse.json(
        { error: 'El formato no está disponible para esta planeación.' },
        { status: 404 }
      )
  }
  const { error } = await db
    .from('fortnights')
    .update({
      format_template_id: parsed.data.template_id,
      use_system_template: !parsed.data.template_id,
    })
    .eq('id', params.id)
    .eq('teacher_id', teacher.id)
  if (error) {
    console.error('[plan-format] update failed:', error)
    return NextResponse.json({ error: 'No se pudo guardar el formato.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
