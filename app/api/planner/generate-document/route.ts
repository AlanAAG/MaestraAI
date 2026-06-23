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
import { type TeacherProfile, DEFAULT_EVAL_COLUMNS } from '@/types/teacher-profile'

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

// Builds rich, attention-ordered teacher context: voice samples → PDA bank → eval format →
// section examples → structure. Placed BEFORE the output schema so it gets high attention.
function profileContext(p: TeacherProfile | null, evalColumns: string[]): string {
  const parts: string[] = []

  // 1. Teacher voice (verbatim style samples; fall back to legacy short examples)
  const samples = p?.writing_style_samples?.length ? p.writing_style_samples : (p?.examples ?? [])
  if (samples.length) {
    parts.push(
      `<teacher_voice>\nEscribe EXACTAMENTE como esta maestra. Estos son fragmentos VERBATIM de su planeación anterior — imita su estilo, vocabulario, nivel de detalle y voz:\n\n${samples
        .map((s, i) => `Ejemplo ${i + 1}:\n"${s}"`)
        .join('\n\n')}\n</teacher_voice>`
    )
  }

  // 2. PDA bank — the anti-hallucination source
  if (p?.pda_bank?.length) {
    parts.push(
      `<pda_bank>\nPROCESOS DE DESARROLLO DE APRENDIZAJE DISPONIBLES (usa estos VERBATIM — no inventes otros):\n${p.pda_bank
        .map(
          (b) =>
            `Campo: ${b.campo}\nContenido: ${b.contenido}\nPDAs:\n${(b.pdas ?? [])
              .map((x) => `  • ${x}`)
              .join('\n')}`
        )
        .join('\n\n')}\n</pda_bank>`
    )
  }

  // 3. Evaluation format for THIS school
  parts.push(
    `<evaluation_format>\nColumnas de evaluación para ESTA escuela: ${evalColumns.join(' / ')}\nUsa SIEMPRE estas columnas en evaluacion_items. NUNCA numérica.\n</evaluation_format>`
  )

  // 4. Verbatim section examples from the teacher's real document
  const ex: string[] = []
  if (p?.actividades_iniciales_example)
    ex.push(
      `<example_actividades_iniciales>\n${p.actividades_iniciales_example}\n</example_actividades_iniciales>`
    )
  if (p?.actividades_rutina_example)
    ex.push(
      `<example_actividades_rutina>\n${p.actividades_rutina_example}\n</example_actividades_rutina>`
    )
  if (p?.estrategia_comunitaria_example)
    ex.push(
      `<example_estrategia_comunitaria>\n${p.estrategia_comunitaria_example}\n</example_estrategia_comunitaria>`
    )
  if (ex.length) parts.push(ex.join('\n'))

  // 5. Structure (lower priority)
  if (p?.sections?.length)
    parts.push(`FORMATO ESCOLAR (secciones en orden): ${p.sections.join(' → ')}`)
  if (p?.activity_blocks?.length && p.block_descriptions)
    parts.push(
      `BLOQUES DE ACTIVIDAD:\n${p.activity_blocks.map((b) => `• ${b}: ${p.block_descriptions?.[b] ?? ''}`).join('\n')}`
    )
  if (p?.notes) parts.push(`ESTILO Y TONO DE LA MAESTRA: ${p.notes}`)

  return parts.filter(Boolean).join('\n\n')
}

function buildQuincenaPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  includeProni: boolean,
  neeStudents: { display_name: string; nee_notes?: string }[],
  vocabList: string,
  richmondInstructions: string,
  profile: TeacherProfile | null,
  evalColumns: string[],
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

  const profileCtx = profileContext(profile, evalColumns)

  const scheduleCtx = `HORARIO DEL GRUPO (usa exactamente este cronograma, sin modificarlo):
${JSON.stringify(schedule.cronograma)}
Letter & Number: SOLO los ${schedule.letterDay}
Números: SOLO los ${schedule.numDay}
${proniNote}`

  const requestData = `<request>
PLANEACIÓN QUINCENA ${fn.number}: ${sanitize(fn.project_name)}
Nivel: Kinder 3 (5-6 años) | Del ${startStr} al ${endStr}
Grupo: ${fn.groups?.name ?? ''} | Grado: ${fn.groups?.grade ?? ''}
Valor del mes: ${sanitize(fn.monthly_value)}
Letras: Semana 1="${sanitize(fn.letter_week1)}" | Semana 2="${sanitize(fn.letter_week2)}"${vocabList ? `\nVocabulario inglés: ${vocabList}` : ''}

${neeSection}
${obsSection}
${richmondCtx ? 'LIBROS RICHMOND:\n' + richmondCtx : ''}
${scheduleCtx}
</request>

Genera la planeación completa en el formato JSON especificado. sub_planes debe ser [] (los sub-planes se generan por separado).`

  // Order: teacher voice → PDAs → eval format → examples → structure → schema → request.
  return [profileCtx, QUINCENA_OUTPUT_SCHEMA, requestData].filter(Boolean).join('\n\n')
}

function buildTallerPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  neeStudents: { display_name: string }[],
  profile: TeacherProfile | null,
  evalColumns: string[],
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

  const profileCtx = profileContext(profile, evalColumns)

  const scheduleCtx = `HORARIO DEL GRUPO (usa exactamente este cronograma):
${JSON.stringify(schedule.cronograma)}
Letter & Number: SOLO los ${schedule.letterDay}
Números: SOLO los ${schedule.numDay}`

  const requestData = `<request>
PLANEACIÓN TALLER: ${sanitize(fn.project_name)}
Fechas: ${startStr} – ${endStr}
Grupo: ${fn.groups?.name ?? ''} | Valor: ${sanitize(fn.monthly_value)}

${neeSection}
${obsSection}
${scheduleCtx}
</request>

Genera la planeación del taller completa en el formato JSON especificado. Los campos son los del schema de taller.`

  return [profileCtx, requestData].filter(Boolean).join('\n\n')
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

    // Load teacher templates for this plan type. Use the newest for STRUCTURE (sections/blocks),
    // but merge the "VOZ DE LA MAESTRA" examples across ALL same-type templates for a richer
    // few-shot voice (more samples = better fidelity), capped + deduped.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: templates } = await (supabase as any)
      .from('teacher_plan_templates')
      .select('template')
      .eq('teacher_id', teacherId)
      .eq('plan_type', planType)
      .order('created_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (templates ?? []).map((t: any) => t.template).filter(Boolean) as TeacherProfile[]
    let profile: TeacherProfile | null = rows[0] ?? null
    if (profile && rows.length > 1) {
      // Merge voice samples + PDA bank across all same-type formats for richer few-shot.
      const mergedVoice = Array.from(
        new Set(rows.flatMap((r) => r?.writing_style_samples ?? r?.examples ?? []))
      ).slice(0, 6)
      const mergedPdas = rows.flatMap((r) => r?.pda_bank ?? [])
      profile = {
        ...profile,
        ...(mergedVoice.length ? { writing_style_samples: mergedVoice } : {}),
        ...(mergedPdas.length ? { pda_bank: mergedPdas } : {}),
      }
    }
    const evalColumns = profile?.evaluation_columns?.length
      ? profile.evaluation_columns
      : DEFAULT_EVAL_COLUMNS

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
        ? buildTallerPrompt(fn, neeStudents, profile, evalColumns, schedule)
        : buildQuincenaPrompt(
            fn,
            includeProni,
            neeStudents,
            vocabList,
            richmondInstructions,
            profile,
            evalColumns,
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
              pdaBank: profile?.pda_bank,
              evalColumns,
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

          // Persist the evaluation columns so the viewer + DOCX export render this school's scale.
          planDocument.evaluation_columns = evalColumns

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
