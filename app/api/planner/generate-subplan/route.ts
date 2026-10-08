import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { isProniApplicable } from '@/lib/nem-official-data'
import { generateSubplan, generateCustomSubplan } from '@/lib/planner/subplan'
import { refreshPlanHealth } from '@/lib/planner/plan-health'
import { nemGroundingBlock } from '@/lib/nem/grounding'
import { attachmentsBlock } from '@/lib/planner/attachment-context'
import { loadPlanTemplate, templateContext } from '@/lib/planner/template-context'
import { NEM_SYNTHESIS } from '@/lib/nem/synthesis'

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
      .select('*, groups(fixed_weekly_schedule, grade)')
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
    fn._grade = fn.grade ?? fn.groups?.grade
    const profile = await loadPlanTemplate(supabase, fn)
    const cachePrefix = `${NEM_SYNTHESIS}\n\n${nemGroundingBlock(includeProni, undefined, fn._grade)}\n\n${templateContext(profile)}\n\n${attachmentsBlock(fn)}`
    const signal = AbortSignal.timeout(100_000)

    const existing = (fn.plan_document ?? {}) as Record<string, unknown>
    const evalColumns = Array.isArray(existing.evaluation_columns)
      ? (existing.evaluation_columns as string[])
      : undefined

    let subplan: Record<string, unknown>
    try {
      subplan = body.data.custom
        ? await generateCustomSubplan(fn, body.data.custom, { evalColumns, cachePrefix, signal })
        : await generateSubplan(fn, body.data.sub_type!, {
            vocabList,
            letterDay,
            numDay,
            includeProni,
            evalColumns,
            cachePrefix,
            signal,
          })
    } catch (error) {
      const message =
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
          ? 'La IA tardó demasiado. Tu documento guardado se conserva; intenta de nuevo.'
          : error instanceof Error
            ? error.message
            : 'No se pudo completar la subplaneación.'
      return NextResponse.json({ error: message }, { status: 502 })
    }

    // Re-read after the model call; generating a sub-plan must not undo edits to the main plan.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: latest, error: readError } = await (supabase as any)
      .from('fortnights')
      .select('plan_document')
      .eq('id', fn.id)
      .eq('teacher_id', teacher.id)
      .single()
    if (readError) throw readError
    const latestDoc = latest?.plan_document as Record<string, unknown> | undefined
    if (!latestDoc) return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 })
    const subPlanes = (Array.isArray(latestDoc.sub_planes) ? latestDoc.sub_planes : []) as Array<
      Record<string, unknown>
    >
    if (!body.data.custom) {
      const oldSub = (Array.isArray(existing.sub_planes) ? existing.sub_planes : []).find(
        (s) => s?.tipo === body.data.sub_type
      )
      const newSub = subPlanes.find((s) => s?.tipo === body.data.sub_type)
      if (JSON.stringify(oldSub) !== JSON.stringify(newSub))
        return NextResponse.json(
          {
            error:
              'Esta subplaneación cambió mientras se generaba. Conservamos tus cambios; intenta de nuevo.',
          },
          { status: 409 }
        )
    }
    // Standard sub-plans (letter_number/numeros) replace by tipo; custom ones are appended.
    const nextSubPlanes = body.data.custom
      ? [...subPlanes, subplan]
      : [
          ...subPlanes.filter((s) => (s as Record<string, unknown>).tipo !== body.data.sub_type),
          subplan,
        ]
    const updated = refreshPlanHealth({ ...latestDoc, sub_planes: nextSubPlanes })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error: saveErr } = await (supabase as any).rpc(
      'save_plan_document_if_unchanged',
      {
        plan_id: fn.id,
        expected_document: latestDoc,
        new_document: updated,
      }
    )
    if (saveErr) throw saveErr
    if (!saved)
      return NextResponse.json(
        { error: 'La planeación cambió. Conservamos tus cambios; intenta de nuevo.' },
        { status: 409 }
      )

    return NextResponse.json({ sub_plan: subplan })
  } catch (err) {
    console.error('[generate-subplan]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
