import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isProniApplicable } from '@/lib/nem-official-data'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptName } from '@/lib/students/name'
import { QUINCENA_SYSTEM, QUINCENA_OUTPUT_SCHEMA } from '@/prompts/planner-quincena'
import { TALLER_SYSTEM } from '@/prompts/planner-taller'
import { callPlannerModel, parsePlanJson } from '@/lib/planner/model'
import { generateSubplan } from '@/lib/planner/subplan'

export const maxDuration = 300

const Schema = z.object({ fortnight_id: z.string().uuid() })

const DEFAULT_CRONOGRAMA = {
  lunes: [
    'honores',
    'estrategia comunitaria',
    'pausa activa',
    'proyecto',
    'educación física',
    'lunch',
    'recreo',
    'aseo',
    'aventura lectora',
    'despedida',
  ],
  martes: [
    'activación',
    'estrategia comunitaria',
    'pausa activa',
    'letter and number',
    'computación',
    'lunch',
    'recreo',
    'aseo',
    'aventura lectora',
    'despedida',
  ],
  miercoles: [
    'activación',
    'estrategia comunitaria',
    'pausa activa',
    'proyecto',
    'educación física',
    'lunch',
    'recreo',
    'aseo',
    'aventura lectora',
    'despedida',
  ],
  jueves: [
    'activación',
    'estrategia comunitaria',
    'pausa activa',
    'números',
    'cantos y juegos',
    'lunch',
    'recreo',
    'aseo',
    'aventura lectora',
    'despedida',
  ],
  viernes: [
    'activación',
    'estrategia comunitaria',
    'pausa activa',
    'proyecto',
    'cuento con papás',
    'lunch',
    'recreo',
    'aseo',
    'aventura lectora',
    'despedida',
  ],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGroupSchedule(fn: any) {
  const sched = fn.groups?.fixed_weekly_schedule
  return {
    letterDay: (sched?.letter_number_day ?? 'martes') as string,
    numDay: (sched?.numeros_day ?? 'jueves') as string,
    cronograma: (sched?.cronograma ?? DEFAULT_CRONOGRAMA) as Record<string, string[]>,
  }
}

type TeacherTemplate = {
  sections?: string[]
  activity_blocks?: string[]
  block_descriptions?: Record<string, string>
  notes?: string
  examples?: string[]
} | null

// Renders the teacher's extracted format into rich prompt context — including the
// activity_blocks + block_descriptions that were previously discarded.
function templateContext(template: TeacherTemplate): string {
  if (!template) return ''
  const blocks =
    template.activity_blocks?.length && template.block_descriptions
      ? `BLOQUES DE ACTIVIDAD DEL FORMATO (respeta estos bloques y lo que va en cada uno):\n${template.activity_blocks
          .map((b) => `• ${b}: ${template.block_descriptions?.[b] ?? ''}`)
          .join('\n')}`
      : ''
  return [
    template.sections?.length
      ? `FORMATO ESCOLAR (secciones en orden): ${template.sections.join(' → ')}`
      : '',
    blocks,
    template.notes ? `ESTILO Y TONO DE LA MAESTRA: ${template.notes}` : '',
    template.examples?.length
      ? `VOZ DE LA MAESTRA (copia este estilo de redacción exactamente):\n${template.examples.map((e) => `• ${e}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildQuincenaPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  includeProni: boolean,
  neeStudents: { display_name: string; nee_notes?: string }[],
  vocabList: string,
  richmondInstructions: string,
  template: TeacherTemplate,
  schedule: { letterDay: string; numDay: string; cronograma: Record<string, string[]> }
): string {
  const sanitize = (s: string | null | undefined) => (s || '').replace(/[\r\n]/g, ' ').slice(0, 200)

  const startStr = new Date(fn.start_date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const endStr = new Date(fn.end_date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const obsCal = fn.observation_calendar as Record<string, string[]> | null
  const obsSection = obsCal
    ? `CALENDARIO DE OBSERVACIÓN:\n${['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map((d) => `${d}: ${(obsCal[d] ?? []).join(', ') || '(ninguno)'}`).join('\n')}`
    : ''

  const bookPages = fn.richmond_book_pages as {
    student_book?: string
    activity_book?: string
    assessment?: string
  } | null
  const richmondBooks = bookPages
    ? [
        bookPages.student_book ? `- STUDENT BOOK páginas ${bookPages.student_book}` : '',
        bookPages.activity_book ? `- ACTIVITY BOOK páginas ${bookPages.activity_book}` : '',
        bookPages.assessment ? `- ASSESSMENT: ${bookPages.assessment}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  const neeSection =
    neeStudents.length > 0
      ? `ALUMNOS CON NEE (incluir en ajustes_razonables):\n${neeStudents.map((s) => `- ${s.display_name}${s.nee_notes ? ': ' + s.nee_notes : ''}`).join('\n')}`
      : 'NEE: (ninguno en este grupo)'

  const proniNote = includeProni
    ? `PRONI (Kinder 3): integrar en actividades del ${schedule.letterDay}. Áreas: Familiarization | Vocabulary | Oral communication | Written language | Cultural awareness | Multilingual identity`
    : ''

  const richmondUnit = sanitize(fn.richmond_unit)
  const richmondCtx = richmondUnit
    ? `UNIDAD RICHMOND: "${richmondUnit}"${richmondInstructions ? '\n' + richmondInstructions.slice(0, 300) : ''}\n${richmondBooks}`
    : richmondBooks

  const templateCtx = templateContext(template)

  const scheduleCtx = `HORARIO DEL GRUPO (usa exactamente este cronograma, sin modificarlo):
${JSON.stringify(schedule.cronograma)}
Letter & Number: SOLO los ${schedule.letterDay}
Números: SOLO los ${schedule.numDay}
${proniNote}`

  return `PLANEACIÓN QUINCENA ${fn.number}: ${sanitize(fn.project_name)}
Nivel: Kinder 3 (5-6 años) | Del ${startStr} al ${endStr}
Grupo: ${fn.groups?.name ?? ''} | Grado: ${fn.groups?.grade ?? ''}
Valor del mes: ${sanitize(fn.monthly_value)}
Letras: Semana 1="${sanitize(fn.letter_week1)}" | Semana 2="${sanitize(fn.letter_week2)}"${vocabList ? `\nVocabulario inglés: ${vocabList}` : ''}

${neeSection}
${obsSection}
${richmondCtx ? 'LIBROS RICHMOND:\n' + richmondCtx : ''}
${scheduleCtx}
${templateCtx}

${QUINCENA_OUTPUT_SCHEMA}

Genera la planeación completa en el formato JSON especificado. sub_planes debe ser [] (los sub-planes se generan por separado).`
}

function buildTallerPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  neeStudents: { display_name: string }[],
  template: TeacherTemplate,
  schedule: { letterDay: string; numDay: string; cronograma: Record<string, string[]> }
): string {
  const sanitize = (s: string | null | undefined) => (s || '').replace(/[\r\n]/g, ' ').slice(0, 200)
  const startStr = new Date(fn.start_date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const endStr = new Date(fn.end_date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const obsCal = fn.observation_calendar as Record<string, string[]> | null
  const obsSection = obsCal
    ? `CALENDARIO DE OBSERVACIÓN:\n${['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map((d) => `${d}: ${(obsCal[d] ?? []).join(', ') || '(ninguno)'}`).join('\n')}`
    : ''

  const neeSection =
    neeStudents.length > 0
      ? `ALUMNOS CON NEE:\n${neeStudents.map((s) => `- ${s.display_name}`).join('\n')}`
      : ''

  const templateCtx = templateContext(template)

  const scheduleCtx = `HORARIO DEL GRUPO (usa exactamente este cronograma):
${JSON.stringify(schedule.cronograma)}
Letter & Number: SOLO los ${schedule.letterDay}
Números: SOLO los ${schedule.numDay}`

  return `PLANEACIÓN TALLER: ${sanitize(fn.project_name)}
Fechas: ${startStr} – ${endStr}
Grupo: ${fn.groups?.name ?? ''} | Valor: ${sanitize(fn.monthly_value)}

${neeSection}
${obsSection}
${scheduleCtx}
${templateCtx}

Genera la planeación del taller completa en el formato JSON especificado. Los campos son los del schema de taller.`
}

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

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
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    const teacherId = teacher.id as string

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select('*, groups(*)')
      .eq('id', body.data.fortnight_id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!fn || (fn as any).teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Fortnight not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planType: 'quincena' | 'taller' = (fn as any).plan_type ?? 'quincena'
    const groupGrade = fn.groups?.grade ?? ''
    const includeProni = isProniApplicable(groupGrade)
    const schedule = getGroupSchedule(fn)

    // Load teacher template for this plan type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: templates } = await (supabase as any)
      .from('teacher_plan_templates')
      .select('template')
      .eq('teacher_id', teacherId)
      .eq('plan_type', planType)
      .order('created_at', { ascending: false })
      .limit(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teacherTemplate: TeacherTemplate = (templates?.[0] as any)?.template ?? null

    // Fetch NEE students
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: students } = await (supabase as any)
      .from('students')
      .select('first_name_encrypted, last_name_encrypted, has_nee, nee_notes')
      .eq('group_id', fn.group_id)
    // Decrypt names (server-side) only for the NEE students we actually inject.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const neeRows = (students ?? []).filter((s: any) => s.has_nee)
    const neeStudents = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      neeRows.map(async (s: any) => ({
        display_name: (await decryptName(s)).name,
        nee_notes: s.nee_notes,
      }))
    )

    // Vocabulary
    let vocabList = ''
    if (Array.isArray(fn.vocabulary) && fn.vocabulary.length > 0) {
      vocabList = (fn.vocabulary as string[]).join(', ')
    }

    // Richmond context
    let richmondInstructions = ''
    if (fn.richmond_unit) {
      const escaped = String(fn.richmond_unit).replace(/[%_]/g, '\\$&')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignment } = await (supabase as any)
        .from('richmond_assignments')
        .select('instructions')
        .eq('group_id', fn.group_id)
        .ilike('title', `%${escaped}%`)
        .order('due_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (assignment?.instructions)
        richmondInstructions = String(assignment.instructions).slice(0, 400)
    }

    const systemPrompt = planType === 'taller' ? TALLER_SYSTEM : QUINCENA_SYSTEM
    const userPrompt =
      planType === 'taller'
        ? buildTallerPrompt(fn, neeStudents, teacherTemplate, schedule)
        : buildQuincenaPrompt(
            fn,
            includeProni,
            neeStudents,
            vocabList,
            richmondInstructions,
            teacherTemplate,
            schedule
          )

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'preparing' })}\n\n`))
        await new Promise((r) => setTimeout(r, 600))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'generating' })}\n\n`))

        try {
          const raw = await callPlannerModel(systemPrompt, userPrompt, { maxTokens: 16384 })
          const planDocument = parsePlanJson(raw)

          // Quincena: auto-generate the Letter & Number + Números sub-plans inline so the
          // document is a complete bundle on first generation (matches the teacher's format).
          // Run in parallel — they only depend on fortnight data, not on the main doc.
          if (planType === 'quincena') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ phase: 'subplanes' })}\n\n`)
            )
            const subOpts = {
              vocabList,
              letterDay: schedule.letterDay,
              numDay: schedule.numDay,
              includeProni,
            }
            const [letterSub, numSub] = await Promise.allSettled([
              generateSubplan(fn, 'letter_number', subOpts),
              generateSubplan(fn, 'numeros', subOpts),
            ])
            const subPlanes: Record<string, unknown>[] = []
            if (letterSub.status === 'fulfilled') subPlanes.push(letterSub.value)
            if (numSub.status === 'fulfilled') subPlanes.push(numSub.value)
            if (letterSub.status === 'rejected')
              console.error('[generate-document] letter_number subplan failed:', letterSub.reason)
            if (numSub.status === 'rejected')
              console.error('[generate-document] numeros subplan failed:', numSub.reason)
            planDocument.sub_planes = subPlanes
          }

          // Preserve any prior sub_planes only if we produced none this run.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existingSubPlanes = ((fn as any).plan_document as any)?.sub_planes
          if (
            (!Array.isArray(planDocument.sub_planes) || planDocument.sub_planes.length === 0) &&
            Array.isArray(existingSubPlanes) &&
            existingSubPlanes.length > 0
          ) {
            planDocument.sub_planes = existingSubPlanes
          }

          // Save plan_document to fortnight
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: saveError } = await (supabase as any)
            .from('fortnights')
            .update({ plan_document: planDocument })
            .eq('id', fn.id)
          if (saveError) throw saveError

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[generate-document] error:', msg)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('[generate-document]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
