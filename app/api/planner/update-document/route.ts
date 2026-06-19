import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const EDITABLE_SECTIONS = new Set([
  'actividades_iniciales',
  'actividades_rutina',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'ejes_articuladores',
  'proyecto',
  'desarrollo_taller',
  'nombre_proyecto',
  'metodologia',
])

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  section: z.string().min(1).max(60),
  value: z.string(),
})

export async function PATCH(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { fortnight_id, section, value } = body.data

    if (!EDITABLE_SECTIONS.has(section)) {
      return NextResponse.json({ error: 'Section not editable' }, { status: 422 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select('id, teacher_id, plan_document')
      .eq('id', fortnight_id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!fn || (fn as any).teacher_id !== (teacher as any).id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!fn.plan_document) {
      return NextResponse.json({ error: 'No plan document exists' }, { status: 422 })
    }

    const updated = { ...(fn.plan_document as Record<string, unknown>), [section]: value }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('fortnights')
      .update({ plan_document: updated })
      .eq('id', fortnight_id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update-document]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
