import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { isProniApplicable } from '@/lib/nem-official-data'
import { generateSubplan, generateCustomSubplan } from '@/lib/planner/subplan'

export const maxDuration = 120

const Schema = z
  .object({
    fortnight_id: z.string().uuid(),
    sub_type: z.enum(['letter_number', 'numeros']).optional(),
    custom: z
      .object({
        methodology: z.string().min(1).max(60),
        name: z.string().min(1).max(80),
        notes: z.string().max(500).optional(),
      })
      .optional(),
  })
  .refine((d) => d.sub_type || d.custom, { message: 'sub_type o custom requerido' })

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select(
        'id, teacher_id, project_name, monthly_value, letter_week1, letter_week2, vocabulary, group_id, plan_document, groups(fixed_weekly_schedule, grade)'
      )
      .eq('id', body.data.fortnight_id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!fn || (fn as any).teacher_id !== (teacher as any).id) {
      return NextResponse.json({ error: 'Fortnight not found' }, { status: 404 })
    }

    const vocabList = Array.isArray(fn.vocabulary) ? (fn.vocabulary as string[]).join(', ') : ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sched = (fn as any).groups?.fixed_weekly_schedule
    const letterDay: string = sched?.letter_number_day ?? 'martes'
    const numDay: string = sched?.numeros_day ?? 'jueves'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const includeProni = isProniApplicable((fn as any).groups?.grade ?? '')

    const existing = (fn.plan_document ?? {}) as Record<string, unknown>
    const evalColumns = Array.isArray(existing.evaluation_columns)
      ? (existing.evaluation_columns as string[])
      : undefined

    let subplan: Record<string, unknown>
    try {
      subplan = body.data.custom
        ? await generateCustomSubplan(fn, body.data.custom, { evalColumns })
        : await generateSubplan(fn, body.data.sub_type!, {
            vocabList,
            letterDay,
            numDay,
            includeProni,
          })
    } catch {
      return NextResponse.json({ error: 'Respuesta inválida del modelo' }, { status: 500 })
    }

    const subPlanes = (Array.isArray(existing.sub_planes) ? existing.sub_planes : []) as unknown[]
    // Standard sub-plans (letter_number/numeros) replace by tipo; custom ones are appended.
    const nextSubPlanes = body.data.custom
      ? [...subPlanes, subplan]
      : [
          ...subPlanes.filter((s) => (s as Record<string, unknown>).tipo !== body.data.sub_type),
          subplan,
        ]
    const updated = { ...existing, sub_planes: nextSubPlanes }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: saveErr } = await (supabase as any)
      .from('fortnights')
      .update({ plan_document: updated })
      .eq('id', fn.id)
    if (saveErr) throw saveErr

    return NextResponse.json({ sub_plan: subplan })
  } catch (err) {
    console.error('[generate-subplan]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
