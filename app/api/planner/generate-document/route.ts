import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isProniApplicable } from '@/lib/nem-official-data'
import { nemGroundingBlock } from '@/lib/nem/grounding'
import { NEM_SYNTHESIS } from '@/lib/nem/synthesis'
import {
  matchPlaneaciones,
  storePlaneacionEmbedding,
  styleExamplesBlock,
  planEmbeddingText,
} from '@/lib/planner/embeddings'
import { refreshLearnedProfileIfStale, getLearnedProfile } from '@/lib/planner/learning'
import { resolveSelectedContent } from '@/lib/richmond/queries'
import { buildRichmondBlock, buildGameVocabularyHint } from '@/lib/prompts/blocks/richmond-block'
import type { SelectedRichmondContent } from '@/lib/richmond/types'
import { checkRateLimit } from '@/lib/rate-limit'
import { QUINCENA_SYSTEM, QUINCENA_OUTPUT_SCHEMA } from '@/prompts/planner-quincena'
import { TALLER_SYSTEM } from '@/prompts/planner-taller'
import { callPlannerModel, parsePlanJson } from '@/lib/planner/model'
import { generateSubplan, generateCustomSubplan } from '@/lib/planner/subplan'
import { type TeacherProfile, DEFAULT_EVAL_COLUMNS } from '@/types/teacher-profile'
import { buildSectionMeta } from '@/lib/planner/section-map'
import { normalizePlanDocument } from '@/lib/planner/normalize-document'

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

// Builds rich, attention-ordered teacher context: per-section voice → PDA bank → eval format →
// structure → custom sections. Placed BEFORE the output schema so it gets high attention.
function profileContext(p: TeacherProfile | null, evalColumns: string[]): { context: string } {
  const parts: string[] = []

  // 1a. Per-section labeled voice samples (new — higher fidelity than generic samples)
  //     Each key matches a plan_document field; the model is told to match that section's style.
  const sectionSamples = p?.section_samples ?? {}
  const sectionKeys = Object.keys(sectionSamples).filter((k) => sectionSamples[k]?.trim())
  if (sectionKeys.length) {
    const blocks = sectionKeys
      .map((k) => `<example_section_${k}>\n${sectionSamples[k]}\n</example_section_${k}>`)
      .join('\n\n')
    parts.push(
      `<per_section_voice>\nEscribo en la voz EXACTA de esta maestra. Cuando generes cada campo del JSON, imita el estilo del ejemplo etiquetado para esa sección:\n\n${blocks}\n</per_section_voice>`
    )
  }

  // 1b. Generic voice samples (fallback / supplement — keep for backwards compat with older profiles)
  const samples = p?.writing_style_samples?.length ? p.writing_style_samples : (p?.examples ?? [])
  if (samples.length) {
    parts.push(
      `<teacher_voice>\nVoz general de la maestra (usa como referencia para secciones sin ejemplo específico):\n\n${samples
        .map((s, i) => `Ejemplo ${i + 1}:\n"${s}"`)
        .join('\n\n')}\n</teacher_voice>`
    )
  }

  // 2. PDA bank — the anti-hallucination source. Reproduce each contenido with EXACTLY its PDAs
  //    (same count, verbatim) so the campos table matches the teacher's document fidelity.
  if (p?.pda_bank?.length) {
    parts.push(
      `<pda_bank>\nPROCESOS DE DESARROLLO DE APRENDIZAJE DISPONIBLES (usa estos VERBATIM — no inventes otros). Para cada contenido, incluye EXACTAMENTE sus PDAs (mismo número, sin consolidar ni omitir):\n${p.pda_bank
        .map(
          (b) =>
            `Campo: ${b.campo}\nContenido: ${b.contenido} (${(b.pdas ?? []).length} PDAs)\nPDAs:\n${(
              b.pdas ?? []
            )
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

  // 4. Full verbatim section examples (legacy fields — supplement per-section samples above)
  const ex: string[] = []
  if (p?.actividades_iniciales_example && !sectionSamples['actividades_iniciales'])
    ex.push(
      `<example_actividades_iniciales>\n${p.actividades_iniciales_example}\n</example_actividades_iniciales>`
    )
  if (p?.actividades_rutina_example && !sectionSamples['actividades_rutina'])
    ex.push(
      `<example_actividades_rutina>\n${p.actividades_rutina_example}\n</example_actividades_rutina>`
    )
  if (p?.estrategia_comunitaria_example && !sectionSamples['estrategia_comunitaria'])
    ex.push(
      `<example_estrategia_comunitaria>\n${p.estrategia_comunitaria_example}\n</example_estrategia_comunitaria>`
    )
  if (ex.length) parts.push(ex.join('\n'))

  // 5. Structure (lower priority)
  if (p?.subplan_inventory?.length)
    parts.push(
      `<estructura_subplaneaciones>\nEsta planeación DEBE reflejar el mismo conjunto de sub-planeaciones que el formato de la maestra:\n${p.subplan_inventory
        .map(
          (s) =>
            `• ${s.metodologia}${s.nombre ? `: ${s.nombre}` : ''}${s.secciones?.length ? ` (${s.secciones.join(', ')})` : ''}`
        )
        .join('\n')}\n</estructura_subplaneaciones>`
    )

  // 5b. Custom sections — detect unmapped teacher sections to generate in custom_sections array.
  const { customSectionNames } = buildSectionMeta(p?.sections ?? [])
  if (customSectionNames.length) {
    parts.push(
      `<secciones_personalizadas>\nEsta maestra usa secciones propias de su escuela que NO son campos estándar. Genera su contenido en el array "custom_sections" del JSON:\n${customSectionNames.map((s) => `• "${s}"`).join('\n')}\n</secciones_personalizadas>`
    )
  }
  if (p?.sections?.length)
    parts.push(`FORMATO ESCOLAR (orden de secciones): ${p.sections.join(' → ')}`)

  if (p?.activity_blocks?.length && p.block_descriptions)
    parts.push(
      `BLOQUES DE ACTIVIDAD:\n${p.activity_blocks.map((b) => `• ${b}: ${p.block_descriptions?.[b] ?? ''}`).join('\n')}`
    )
  if (p?.notes) parts.push(`ESTILO Y TONO DE LA MAESTRA: ${p.notes}`)

  // Verb person — high-impact voice lever, especially for new teachers using a shared school
  // format. Detected from her document; omitted (neutral) when unknown.
  const vp = p?.verb_person
  if (vp) {
    const rule =
      vp === 'primera_plural'
        ? 'primera persona del PLURAL (nosotros/as: "presentamos", "observamos", "trabajaremos")'
        : vp === 'infinitivo'
          ? 'INFINITIVO ("presentar", "observar", "trabajar")'
          : 'primera persona del SINGULAR (yo: "presento", "observo", "trabajaré")'
    parts.push(
      `<persona_verbal>\nRedacta TODA la planeación en ${rule}. Mantén esta persona verbal de forma consistente en cada sección.\n</persona_verbal>`
    )
  }

  // Formatting rules detected in her document — placed LAST so they sit closest to the output
  // schema (highest attention). Every rule traces back to something extracted, never hardcoded.
  const fr = p?.formatting_rules
  if (fr) {
    const lines = [
      fr.bullet_label_bold === true
        ? '• En actividades_iniciales y actividades_rutina: cada viñeta DEBE empezar con "**Nombre:** descripción" (etiqueta en negritas + dos puntos).'
        : fr.bullet_label_bold === false
          ? '• Actividades: texto plano sin negritas en la etiqueta.'
          : '',
      fr.estrategia_comunitaria_format === 'numbered_steps'
        ? '• estrategia_comunitaria: usa pasos numerados (1. 2. 3...), NO viñetas ni párrafos.'
        : fr.estrategia_comunitaria_format === 'paragraphs'
          ? '• estrategia_comunitaria: redacta en párrafos, no en lista.'
          : '',
      fr.ejes_articuladores_format === 'bold_label_paragraph'
        ? '• ejes_articuladores: cada eje como "• **Nombre del eje:** párrafo de 2-3 oraciones."'
        : '',
      fr.proyecto_subheadings?.length
        ? `• proyecto: usa EXACTAMENTE estos sub-encabezados en negritas, en este orden:\n${fr.proyecto_subheadings.map((s) => `   **${s}**`).join('\n')}`
        : '',
      fr.ajustes_subheadings?.length
        ? `• ajustes_razonables: usa estos sub-encabezados con "## " en este orden:\n${fr.ajustes_subheadings.map((s) => `   ## ${s}`).join('\n')}`
        : '',
      fr.section_title_case === 'ALL_CAPS'
        ? '• Títulos de sección en MAYÚSCULAS.'
        : fr.section_title_case === 'Title Case'
          ? '• Títulos de sección en Mayúscula Inicial.'
          : '',
      fr.campos_position === 'per_subplan'
        ? '• Campos Formativos: NO los pongas como bloque de nivel superior. Deja el array "campos_formativos" del documento principal VACÍO ([]); cada sub-planeación lleva su propia tabla de campos.'
        : '',
    ].filter(Boolean)
    if (lines.length) {
      parts.push(
        `<formatting_rules>\nREGLAS DE FORMATO DETECTADAS EN EL DOCUMENTO DE ESTA MAESTRA — SÍGUELAS EXACTAMENTE:\n${lines.join('\n')}\n</formatting_rules>`
      )
    }
  }

  return { context: parts.filter(Boolean).join('\n\n') }
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
  schedule: { letterDay: string; numDay: string; cronograma: Record<string, string[]> },
  styleBlock: string = '',
  richmondBlock: string = '',
  gameHint: string = ''
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

  // Book pages to cover, per week (new shape). Older plans used student_book/activity_book/assessment.
  const bookPages = fn.richmond_book_pages as {
    week1?: string
    week2?: string
    student_book?: string
    activity_book?: string
    assessment?: string
  } | null
  const richmondBooks = bookPages
    ? [
        bookPages.week1 ? `- Semana 1: páginas del libro ${bookPages.week1}` : '',
        bookPages.week2 ? `- Semana 2: páginas del libro ${bookPages.week2}` : '',
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

  // PRONI contenidos/PDAs come from <proni_contenidos> in the grounding block (verbatim).
  const proniNote = includeProni
    ? `PRONI (Kinder 3): integra inglés en las actividades del ${schedule.letterDay} usando los contenidos y PDAs de <proni_contenidos>.`
    : ''

  const richmondUnit = sanitize(fn.richmond_unit)
  const richmondCtx = richmondUnit
    ? `UNIDAD RICHMOND: "${richmondUnit}"${richmondInstructions ? '\n' + richmondInstructions.slice(0, 300) : ''}\n${richmondBooks}`
    : richmondBooks

  const { context: profileCtx } = profileContext(profile, evalColumns)

  // Inject teacher's actual proyecto sub-sections (replaces hardcoded "Punto de Partida / Planeación…").
  const proyectoInv = profile?.subplan_inventory?.find(
    (s) =>
      s.metodologia?.toLowerCase().includes('proyecto') ||
      s.metodologia?.toLowerCase().includes('situacion')
  )
  const proyectoSecciones = proyectoInv?.secciones?.length
    ? `\n<estructura_proyecto>\nEl campo "proyecto" DEBE usar EXACTAMENTE estos sub-encabezados en negritas, en este orden:\n${proyectoInv.secciones.map((s) => `  **${s}**`).join('\n')}\n</estructura_proyecto>`
    : ''

  // High-priority: the teacher's explicit requests + continuity with the previous quincena.
  const tNotes = String(fn.teacher_notes ?? '').slice(0, 1500)
  const pNotes = String(fn.project_notes ?? '').slice(0, 1500)
  const teacherReq =
    tNotes || pNotes
      ? `<teacher_requests>\nLa maestra pidió ESPECÍFICAMENTE incluir lo siguiente — priorízalo e intégralo de forma natural:\n${tNotes ? `General: ${tNotes}\n` : ''}${pNotes ? `Proyecto: ${pNotes}` : ''}\n</teacher_requests>`
      : ''
  const continuity = String(fn.__continuity ?? '')
  const continuityBlock = continuity
    ? `<continuidad>\n${continuity}\nEsta quincena es CONTINUACIÓN del ciclo: retoma, da seguimiento o referencia lo anterior donde tenga sentido (no empieces de cero si el proyecto continúa).\n</continuidad>`
    : ''

  const scheduleCtx = `HORARIO DEL GRUPO (usa exactamente este cronograma, sin modificarlo):
${JSON.stringify(schedule.cronograma)}
Letter & Number: SOLO los ${schedule.letterDay}
Números: SOLO los ${schedule.numDay}
${proniNote}`

  const requestData = `<request>
PLANEACIÓN QUINCENA ${fn.number}: ${sanitize(fn.project_name)}
Nivel: Kinder 3 (5-6 años) | Del ${startStr} al ${endStr}
Grado: ${fn._grade ?? fn.groups?.grade ?? ''} | Grupos: ${fn._gradeGroupNames ?? fn.groups?.name ?? ''} (esta planeación es para TODO el grado, inclusiva de todos sus grupos)
Valor del mes: ${sanitize(fn.monthly_value)}
Letras: Semana 1="${sanitize(fn.letter_week1)}" | Semana 2="${sanitize(fn.letter_week2)}"${vocabList ? `\nVocabulario maestra: ${vocabList}` : ''}

${neeSection}
${obsSection}
${richmondCtx ? 'LIBROS RICHMOND:\n' + richmondCtx : ''}
${scheduleCtx}
${richmondBlock}${gameHint ? '\n' + gameHint : ''}
</request>

Genera la planeación completa en el formato JSON especificado. sub_planes debe ser [] (los sub-planes se generan por separado).`

  // Grounding (NEM synthesis + PDA bank) is injected as a cached SYSTEM prefix, not here.
  // Order: style examples → teacher voice → PDAs → proyecto structure → requests → continuity → schema → request.
  return [
    styleBlock,
    profileCtx,
    proyectoSecciones,
    teacherReq,
    continuityBlock,
    QUINCENA_OUTPUT_SCHEMA,
    requestData,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildTallerPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  neeStudents: { display_name: string }[],
  profile: TeacherProfile | null,
  evalColumns: string[],
  schedule: { letterDay: string; numDay: string; cronograma: Record<string, string[]> },
  styleBlock: string = '',
  richmondBlock: string = '',
  gameHint: string = ''
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

  const { context: profileCtx } = profileContext(profile, evalColumns)

  const scheduleCtx = `HORARIO DEL GRUPO (usa exactamente este cronograma):
${JSON.stringify(schedule.cronograma)}
Letter & Number: SOLO los ${schedule.letterDay}
Números: SOLO los ${schedule.numDay}`

  const requestData = `<request>
PLANEACIÓN TALLER: ${sanitize(fn.project_name)}
Fechas: ${startStr} – ${endStr}
Grado: ${fn._grade ?? fn.groups?.grade ?? ''} | Grupos: ${fn._gradeGroupNames ?? fn.groups?.name ?? ''} | Valor: ${sanitize(fn.monthly_value)}

${neeSection}
${obsSection}
${scheduleCtx}
${richmondBlock}${gameHint ? '\n' + gameHint : ''}
</request>

Genera la planeación del taller completa en el formato JSON especificado. Los campos son los del schema de taller.`

  // Grounding is injected as a cached system prefix, not here.
  return [styleBlock, profileCtx, requestData].filter(Boolean).join('\n\n')
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
    // Per-grade: the plan covers every group of the grade (migration 059). Fall back to the
    // representative group's grade for older rows without a stored grade.
    const groupGrade = (fn.grade as string | null) ?? fn.groups?.grade ?? ''
    const includeProni = isProniApplicable(groupGrade)
    const schedule = getGroupSchedule(fn)

    // All groups of this grade (taught by this teacher) — content must be inclusive of all of them.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gradeGroupsData } = await (supabase as any)
      .from('groups')
      .select('id, name')
      .eq('titular_teacher_id', teacherId)
      .eq('grade', groupGrade)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gradeGroups = (gradeGroupsData ?? []) as { id: string; name: string }[]
    const gradeGroupIds = gradeGroups.length ? gradeGroups.map((g) => g.id) : [fn.group_id]
    const gradeGroupNames = gradeGroups.map((g) => g.name).join(', ') || (fn.groups?.name ?? '')
    // Expose the inclusive group list + resolved grade to the prompt builders (which receive fn).
    fn._gradeGroupNames = gradeGroupNames
    fn._grade = groupGrade

    // Richmond Unit Overview: resolve the teacher's selected book content (PRONI groups only).
    let richmondContent: SelectedRichmondContent | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const richmondUnitId = (fn as any).richmond_unit_id as string | null
    if (includeProni && richmondUnitId) {
      richmondContent = await resolveSelectedContent(
        supabase,
        richmondUnitId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((fn as any).richmond_lesson_group_ids as string[] | null) ?? []
      )
    }
    const richmondBlock = buildRichmondBlock(richmondContent)
    const gameHint = buildGameVocabularyHint(richmondContent)

    // Continuity: the most recent prior planeación for this group, so each quincena builds on the
    // cycle (continue a project, reference prior learning) instead of starting from scratch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prev } = await (supabase as any)
      .from('fortnights')
      .select('number, project_name, monthly_value, plan_document, start_date')
      .eq('group_id', fn.group_id)
      .eq('plan_type', planType)
      .lt('start_date', fn.start_date)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (prev) {
      const prevProj = (prev.plan_document?.nombre_proyecto as string) ?? prev.project_name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(fn as any).__continuity =
        `Planeación anterior (#${prev.number}): proyecto "${prevProj}", valor del mes "${prev.monthly_value}".`
    }

    // Load templates for this plan type — the teacher's OWN plus any shared with their school
    // (RLS returns both; no teacher_id filter). Prefer her own for STRUCTURE (own-first), and merge
    // the "VOZ DE LA MAESTRA" examples across all same-type templates for richer voice. A teacher
    // with no own format inherits the school's shared/official one.
    // is_school_official + the school-shared RLS policy only exist after migration 060 — fall back
    // to the teacher's own templates if the column/policy isn't there yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: templates } = await (supabase as any)
      .from('teacher_plan_templates')
      .select('template, teacher_id, is_school_official, created_at')
      .eq('plan_type', planType)
      .order('created_at', { ascending: false })
    if (!templates) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data: templates } = await (supabase as any)
        .from('teacher_plan_templates')
        .select('template, teacher_id, created_at')
        .eq('teacher_id', teacherId)
        .eq('plan_type', planType)
        .order('created_at', { ascending: false }))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((templates ?? []) as any[])
      // Own formats first, then official school formats, then the rest.
      .sort(
        (a, b) =>
          Number(b.teacher_id === teacherId) - Number(a.teacher_id === teacherId) ||
          Number(!!b.is_school_official) - Number(!!a.is_school_official) ||
          (a.created_at < b.created_at ? 1 : -1)
      )
      .map((t) => t.template)
      .filter(Boolean) as TeacherProfile[]
    // If the teacher chose "Diseño de MaestraIA" for this plan, ignore their uploaded format.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useSystem = (fn as any).use_system_template === true
    let profile: TeacherProfile | null = useSystem ? null : (rows[0] ?? null)
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

    // Compute section order/titles from teacher's format for dynamic viewer rendering.
    const { sectionOrder, sectionTitles } = buildSectionMeta(profile?.sections ?? [])

    // Self-improving: refresh (if stale) + load the teacher's LEARNED style (from her edited plans
    // + corrections), merge her learned voice samples into the profile. Best-effort.
    await refreshLearnedProfileIfStale(supabase, teacherId, planType)
    const learned = await getLearnedProfile(supabase, teacherId, planType)
    const learnedSamples = learned?.profile?.writing_style_samples ?? []
    if (learnedSamples.length) {
      const merged = Array.from(
        new Set([...(profile?.writing_style_samples ?? []), ...learnedSamples])
      ).slice(0, 6)
      profile = { ...(profile ?? {}), writing_style_samples: merged }
    }

    // Fetch NEE students across ALL groups of the grade (plan is inclusive of every group).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: students } = await (supabase as any)
      .from('students')
      .select('has_nee, nee_notes')
      .in('group_id', gradeGroupIds)
    // LFPDPPP: disability + name is sensitive data. NEVER pass real student names into the
    // prompt/output — anonymize to positional labels (Alumno A, B…). Names are not decrypted.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const neeRows = (students ?? []).filter((s: any) => s.has_nee)
    const neeStudents = neeRows.map((s: { nee_notes: string | null }, i: number) => ({
      display_name: `Alumno ${i < 26 ? String.fromCharCode(65 + i) : String(i + 1)}`,
      nee_notes: s.nee_notes,
    }))

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
    // Cached grounding prefix — identical across the main + all sub-plan calls in this generation.
    const cachePrefix = `${NEM_SYNTHESIS}\n\n${nemGroundingBlock(includeProni)}`

    // RAG: retrieve THIS teacher's most-similar past plans → inject as style examples (her voice).
    // Best-effort; empty if no key / migration 054 not pushed / no prior plans.
    const styleExamples = await matchPlaneaciones(supabase, {
      queryText: `${String(fn.project_name ?? '')} ${String(fn.monthly_value ?? '')}`.trim(),
      teacherId,
      excludeFortnight: fn.id,
    })
    // High-signal learned preferences (distilled from her corrections) — the accuracy lever.
    const prefsBlock = learned?.preferences?.trim()
      ? `<preferencias_aprendidas>\nPreferencias de ESTA maestra, aprendidas de sus correcciones anteriores. Respétalas:\n${learned.preferences.trim()}\n</preferencias_aprendidas>`
      : ''
    const styleBlock = [styleExamplesBlock(styleExamples), prefsBlock].filter(Boolean).join('\n\n')

    const userPrompt =
      planType === 'taller'
        ? buildTallerPrompt(
            fn,
            neeStudents,
            profile,
            evalColumns,
            schedule,
            styleBlock,
            richmondBlock,
            gameHint
          )
        : buildQuincenaPrompt(
            fn,
            includeProni,
            neeStudents,
            vocabList,
            richmondInstructions,
            profile,
            evalColumns,
            schedule,
            styleBlock,
            richmondBlock,
            gameHint
          )

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'preparing' })}\n\n`))
        await new Promise((r) => setTimeout(r, 600))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'generating' })}\n\n`))

        try {
          const raw = await callPlannerModel(systemPrompt, userPrompt, {
            maxTokens: 16384,
            cachePrefix,
          })
          const planDocument = parsePlanJson(raw)

          // Embed teacher's section order + titles so the viewer renders in the right order.
          if (sectionOrder.length) {
            planDocument._section_order = sectionOrder
            planDocument._section_titles = sectionTitles
          }
          // Embed the detected formatting rules so the DOCX exporter can mirror them.
          if (profile?.formatting_rules) {
            planDocument._formatting_rules = profile.formatting_rules
          }

          // Quincena: auto-generate the Letter & Number + Números sub-plans inline so the
          // document is a complete bundle on first generation (matches the teacher's format).
          // Run in parallel — they only depend on fortnight data, not on the main doc.
          if (planType === 'quincena') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ phase: 'subplanes' })}\n\n`)
            )
            // Sub-plans (Letter & Number especially) must use the Richmond book vocab when present.
            const subVocabList = richmondContent?.vocabulary?.length
              ? Array.from(
                  new Set([
                    ...richmondContent.vocabulary,
                    ...(Array.isArray(fn.vocabulary) ? (fn.vocabulary as string[]) : []),
                  ])
                ).join(', ')
              : vocabList
            const subOpts = {
              vocabList: subVocabList,
              letterDay: schedule.letterDay,
              numDay: schedule.numDay,
              includeProni,
              pdaBank: profile?.pda_bank,
              evalColumns,
              cachePrefix,
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

            // Mirror the teacher's example: auto-generate the extra sub-plans it contains
            // (Taller, ABJ, etc.) beyond the standard Proyecto + Letter&Number + Números.
            // Best-effort (allSettled), capped, non-fatal. Centro de Interés is already covered
            // by letter_number/numeros, and Proyecto is the top-level field.
            const extras = (profile?.subplan_inventory ?? [])
              .filter(
                (s) => !/proyecto|centro de inter/i.test(s.metodologia) && !!s.metodologia?.trim()
              )
              .slice(0, 3)
            if (extras.length) {
              const extraResults = await Promise.allSettled(
                extras.map((s) =>
                  generateCustomSubplan(
                    fn,
                    { methodology: s.metodologia, name: s.nombre || s.metodologia },
                    { evalColumns, pdaBank: profile?.pda_bank, cachePrefix }
                  )
                )
              )
              for (const r of extraResults) {
                if (r.status === 'fulfilled') subPlanes.push(r.value)
                else console.error('[generate-document] extra subplan failed:', r.reason)
              }
            }
            planDocument.sub_planes = subPlanes
          }

          // Keep any teacher-added CUSTOM sub-plans across a regeneration (don't wipe them).
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existingSubPlanes = ((fn as any).plan_document as any)?.sub_planes
          if (Array.isArray(existingSubPlanes) && existingSubPlanes.length > 0) {
            if (!Array.isArray(planDocument.sub_planes) || planDocument.sub_planes.length === 0) {
              planDocument.sub_planes = existingSubPlanes
            } else {
              const custom = (existingSubPlanes as unknown[]).filter(
                (s) => !['letter_number', 'numeros'].includes((s as { tipo?: string })?.tipo ?? '')
              )
              ;(planDocument.sub_planes as unknown[]).push(...custom)
            }
          }

          // Persist the evaluation columns so the viewer + DOCX export render this school's scale.
          planDocument.evaluation_columns = evalColumns

          // Normalize every section to a consistent shape (strings where strings are expected) so
          // the saved document always renders + exports completely — never a blank/half section.
          const normalized = normalizePlanDocument(planDocument)

          // Save plan_document to fortnight
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: saveError } = await (supabase as any)
            .from('fortnights')
            .update({ plan_document: normalized })
            .eq('id', fn.id)
          if (saveError) throw saveError

          // Embed this plan for future style-example retrieval (best-effort, non-fatal).
          await storePlaneacionEmbedding(supabase, {
            fortnightId: fn.id,
            teacherId,
            projectName: String(fn.project_name ?? ''),
            content: planEmbeddingText(normalized),
          })

          // Transparency: tell the client how much of HER history informed this plan.
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                phase: 'meta',
                learnedFrom: styleExamples.length,
                preferencesApplied: !!prefsBlock,
              })}\n\n`
            )
          )
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
