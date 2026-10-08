import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isProniApplicable } from '@/lib/nem-official-data'
import { nemGroundingBlock } from '@/lib/nem/grounding'
import { enfoqueBlock, enfoqueLabel } from '@/lib/planner/enfoques'
import { NEM_SYNTHESIS } from '@/lib/nem/synthesis'
import {
  selectRelevantContenidos,
  contenidosSugeridosBlock,
  contenidosFromTitles,
} from '@/lib/nem/select-contenidos'
import { autoSelectNem, extractRecentChoices } from '@/lib/planner/auto-select'
import { enforceCamposFormativos } from '@/lib/nem/enforce-contenidos'
import type { ContenidoPDA } from '@/lib/nem/contenidos-fase2'
import { extractUsedFichas, pickFichas, buildFichaBlock } from '@/lib/nem/ficha-rotation'
import { buildNeeSection } from '@/lib/planner/nee-section'
import { checkPlanHealth } from '@/lib/planner/plan-health'
import { attachmentsBlock } from '@/lib/planner/attachment-context'
import { templateContext } from '@/lib/planner/template-context'
import { mainHeadings, mainHeadingsBlock } from '@/lib/planner/format-requirements'
import { generateMainDocument } from '@/lib/planner/generate-parts'
import { matchAttachmentChunks } from '@/lib/planner/attachment-rag'
import { matchNemKnowledge, nemKnowledgeBlock } from '@/lib/nem/knowledge'
import {
  matchPlaneaciones,
  storePlaneacionEmbedding,
  styleExamplesBlock,
  planEmbeddingText,
} from '@/lib/planner/embeddings'
import { getLearnedProfile } from '@/lib/planner/learning'
import { resolveSelectedContent } from '@/lib/richmond/queries'
import { buildRichmondBlock, buildGameVocabularyHint } from '@/lib/prompts/blocks/richmond-block'
import type { SelectedRichmondContent } from '@/lib/richmond/types'
import { checkRateLimit } from '@/lib/rate-limit'
import { QUINCENA_SYSTEM, QUINCENA_OUTPUT_SCHEMA } from '@/prompts/planner-quincena'
import { TALLER_SYSTEM } from '@/prompts/planner-taller'
import { activeGroups } from '@/lib/groups/archive'
import { generateSubplan, generateCustomSubplan, additionalUnits } from '@/lib/planner/subplan'
import { type TeacherProfile, DEFAULT_EVAL_COLUMNS } from '@/types/teacher-profile'
import { buildSectionMeta } from '@/lib/planner/section-map'
import { normalizePlanDocument, expandStrategyAcronym } from '@/lib/planner/normalize-document'
import { decrypt } from '@/lib/encryption'
import { scrubNames, hasTemplateStructure } from '@/lib/planner/extract-template'

export const maxDuration = 300

const Schema = z.object({ fortnight_id: z.string().uuid() })

const DEFAULT_CRONOGRAMA = {
  lunes: [
    'honores',
    'Estrategias comunitarias para la construcción de espacios escolares libres de violencia',
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
    'Estrategias comunitarias para la construcción de espacios escolares libres de violencia',
    'pausa activa',
    'letters',
    'computación',
    'lunch',
    'recreo',
    'aseo',
    'aventura lectora',
    'despedida',
  ],
  miercoles: [
    'activación',
    'Estrategias comunitarias para la construcción de espacios escolares libres de violencia',
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
    'Estrategias comunitarias para la construcción de espacios escolares libres de violencia',
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
    'Estrategias comunitarias para la construcción de espacios escolares libres de violencia',
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

  // 2. (removed) The teacher's extracted <pda_bank> used to be "la ÚNICA fuente" for
  //    campos_formativos, but LLM extraction is lossy (incomplete/paraphrased fragments) and it
  //    produced wrong desgloses. The OFFICIAL bank (cached system prefix) is now the only PDA text
  //    source; her pda_bank only biases the contenido shortlist (see selectRelevantContenidos hint).

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
      // ponytail: per_subplan can leave the main doc missing a campo with no union check.
      // Rare (only fires for a teacher template that requests it); revisit if it surfaces.
      fr.campos_position === 'per_subplan'
        ? '• Campos Formativos: conserva el array "campos_formativos" del documento principal como referencia oficial; cada sub-planeación lleva también su propia tabla de campos.'
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
  gameHint: string = '',
  contenidosBlock: string = '',
  knowledgeBlock: string = ''
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
    week3?: string
    week4?: string
    student_book?: string
    activity_book?: string
    assessment?: string
  } | null
  const richmondBooks = bookPages
    ? [
        bookPages.week1 ? `- Semana 1: páginas del libro ${bookPages.week1}` : '',
        bookPages.week2 ? `- Semana 2: páginas del libro ${bookPages.week2}` : '',
        bookPages.week3 ? `- Semana 3: páginas del libro ${bookPages.week3}` : '',
        bookPages.week4 ? `- Semana 4: páginas del libro ${bookPages.week4}` : '',
        bookPages.student_book ? `- STUDENT BOOK páginas ${bookPages.student_book}` : '',
        bookPages.activity_book ? `- ACTIVITY BOOK páginas ${bookPages.activity_book}` : '',
        bookPages.assessment ? `- ASSESSMENT: ${bookPages.assessment}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  const neeSection = buildNeeSection(
    neeStudents,
    fn.nee_notes,
    'AUN ASÍ, ajustes_razonables lleva su estructura completa (viñeta inicial + las 5 categorías con "## "), con estrategias de diseño universal para TODO el grupo.'
  )

  // PRONI contenidos/PDAs come from <proni_contenidos> in the grounding block (verbatim).
  const proniNote = includeProni
    ? `PRONI (Kinder 3): integra inglés en las actividades del ${schedule.letterDay} usando los contenidos y PDAs de <proni_contenidos>.`
    : ''

  const richmondUnit = sanitize(fn.richmond_unit)
  const richmondCtx = richmondUnit
    ? `UNIDAD RICHMOND: "${richmondUnit}"${richmondInstructions ? '\n' + richmondInstructions.slice(0, 300) : ''}\n${richmondBooks}`
    : richmondBooks

  const { context: profileCtx } = profileContext(profile, evalColumns)

  const proyectoSecciones = mainHeadingsBlock(fn.__mainHeadings ?? [])

  // Reference files the teacher attached at creation (migration 075) — extracted text,
  // plus RAG fragments (migration 080) pre-fetched into __attachRag by the route.
  const ragBlock = String(fn.__attachRag ?? '')
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
  const fichaBlock = String(fn.__fichaBlock ?? '')
  const pausasBlock = String(fn.__pausasBlock ?? '')

  const scheduleCtx = `HORARIO DEL GRUPO (usa exactamente este cronograma, sin modificarlo):
${expandStrategyAcronym(JSON.stringify(schedule.cronograma))}
Letters: SOLO los ${schedule.letterDay}
Números: SOLO los ${schedule.numDay}
${proniNote}`

  // Letters and Números are generated as their OWN sub-planeaciones. Without this the model
  // develops those two days inside "proyecto" too, so the main document repeats what the
  // sub-plans already say — the duplication teachers notice first.
  const subPlanSplit = `<separacion_de_documentos>
Esta planeación se entrega en DOCUMENTOS SEPARADOS: el principal (proyecto) y, aparte, la planeación de Letters (${schedule.letterDay}) y la de Números (${schedule.numDay}).
En el documento principal NO desarrolles las actividades de ${schedule.letterDay} (Letters) ni de ${schedule.numDay} (Números): ni sus juegos, ni sus hojas de trabajo, ni sus cuentos, ni su cierre. Esos días ya tienen su propio documento.
El cronograma SÍ los conserva como renglón del horario — eso es correcto y no cambia.
</separacion_de_documentos>`

  // Mes = monthly (4-week) plan; reuses the quincena structure with a duration hint.
  // Month plans store plan_type='quincena' + is_month=true (the constraint-safe encoding).
  const isMes = !!fn.is_month || fn.plan_type === 'mes'
  const durationBlock = isMes
    ? `<duracion>\nEsta planeación cubre UN MES COMPLETO (4 semanas). Distribuye el cronograma, el proyecto y las actividades a lo largo de las 4 semanas del mes, con progresión semana a semana. Las Letras y Números abarcan el mes completo.\n</duracion>`
    : ''

  // Teacher's stated objective drives the whole plan (from the "¿Qué quieres que aprendan?" input).
  const goalBlock = fn.learning_goal
    ? `<objetivo_maestra>\nLo que la maestra quiere que los niños aprendan este ${isMes ? 'mes' : 'quincena'}: "${sanitize(fn.learning_goal)}".\nToda la planeación (proyecto, actividades, aprendizajes, evaluación) debe girar en torno a este objetivo.\n</objetivo_maestra>`
    : ''

  // Teacher-selected ejes articuladores (union across units, optional). When set, the plan MUST
  // feature exactly these — overrides the model's "pick 2-3" default in the grounding block.
  const teacherEjes: string[] = Array.isArray(fn.unidades_didacticas)
    ? Array.from(
        new Set(
          fn.unidades_didacticas.flatMap((u: { ejes?: unknown }) =>
            Array.isArray(u?.ejes) ? (u.ejes as string[]) : []
          )
        )
      )
    : []
  const ejesBlock = teacherEjes.length
    ? `<ejes_seleccionados>\nLa maestra eligió estos ejes articuladores para esta planeación. En el campo "ejes_articuladores" usa EXACTAMENTE estos (una viñeta por cada uno, conectado a una actividad CONCRETA de este plan). NO agregues otros ejes:\n${teacherEjes.map((e) => `  • ${e}`).join('\n')}\n</ejes_seleccionados>`
    : ''

  // Letters: 4 weeks for month plans, 2 for quincena.
  const lettersLine = isMes
    ? `Letras: Semana 1="${sanitize(fn.letter_week1)}" | Semana 2="${sanitize(fn.letter_week2)}" | Semana 3="${sanitize(fn.letter_week3)}" | Semana 4="${sanitize(fn.letter_week4)}"`
    : `Letras: Semana 1="${sanitize(fn.letter_week1)}" | Semana 2="${sanitize(fn.letter_week2)}"`

  const requestData = `<request>
PLANEACIÓN ${isMes ? 'MENSUAL' : 'QUINCENA'} ${fn.number}: ${sanitize(fn.project_name)}
Nivel: Kinder 3 (5-6 años) | Del ${startStr} al ${endStr}
Grado: ${fn._grade ?? fn.groups?.grade ?? ''} | Grupos: ${fn._gradeGroupNames ?? fn.groups?.name ?? ''} (esta planeación es para TODO el grado, inclusiva de todos sus grupos)
Valor del mes: ${sanitize(fn.monthly_value)}
${lettersLine}${vocabList ? `\nVocabulario maestra: ${vocabList}` : ''}

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
    goalBlock,
    profileCtx,
    contenidosBlock,
    ejesBlock,
    knowledgeBlock,
    durationBlock,
    proyectoSecciones,
    enfoqueBlock(fn.pedagogical_approach),
    teacherReq,
    ragBlock,
    continuityBlock,
    subPlanSplit,
    fichaBlock,
    pausasBlock,
    QUINCENA_OUTPUT_SCHEMA,
    requestData,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildTallerPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  neeStudents: { display_name: string; nee_notes?: string | null }[],
  profile: TeacherProfile | null,
  evalColumns: string[],
  schedule: { letterDay: string; numDay: string; cronograma: Record<string, string[]> },
  styleBlock: string = '',
  richmondBlock: string = '',
  gameHint: string = '',
  knowledgeBlock: string = ''
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

  const neeSection = buildNeeSection(
    neeStudents,
    fn.nee_notes,
    'AUN ASÍ, incluye ajustes razonables de diseño universal para TODO el grupo.'
  )

  const { context: profileCtx } = profileContext(profile, evalColumns)

  const scheduleCtx = `HORARIO DEL GRUPO (usa exactamente este cronograma):
${expandStrategyAcronym(JSON.stringify(schedule.cronograma))}
Letters: SOLO los ${schedule.letterDay}
Números: SOLO los ${schedule.numDay}`

  // Teacher-selected ejes articuladores (optional) — same override as the quincena path.
  const teacherEjes: string[] = Array.isArray(fn.unidades_didacticas)
    ? Array.from(
        new Set(
          fn.unidades_didacticas.flatMap((u: { ejes?: unknown }) =>
            Array.isArray(u?.ejes) ? (u.ejes as string[]) : []
          )
        )
      )
    : []
  const ejesBlock = teacherEjes.length
    ? `<ejes_seleccionados>\nLa maestra eligió estos ejes articuladores. En "ejes_articuladores" usa EXACTAMENTE estos (uno por viñeta, ligado a una actividad concreta). NO agregues otros:\n${teacherEjes.map((e) => `  • ${e}`).join('\n')}\n</ejes_seleccionados>`
    : ''

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
  return [
    styleBlock,
    profileCtx,
    ejesBlock,
    knowledgeBlock,
    enfoqueBlock(fn.pedagogical_approach),
    String(fn.__attachRag ?? ''),
    requestData,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  const deadline = Date.now() + 270_000
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
    const planType: 'quincena' | 'taller' | 'mes' = (fn as any).plan_type ?? 'quincena'
    // Per-grade: the plan covers every group of the grade (migration 059). Fall back to the
    // representative group's grade for older rows without a stored grade.
    const groupGrade = (fn.grade as string | null) ?? fn.groups?.grade ?? ''
    const includeProni = isProniApplicable(groupGrade)
    const schedule = getGroupSchedule(fn)

    // All ACTIVE groups of this grade (taught by this teacher) — content must be inclusive of
    // all of them; archived cohorts (past school years) are excluded. select('*') + JS filter
    // so a missing archived_at column (pre-migration 067) reads as active.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gradeGroupsData } = await (supabase as any)
      .from('groups')
      .select('*')
      .eq('titular_teacher_id', teacherId)
      .eq('grade', groupGrade)
    const gradeGroups = activeGroups(
      (gradeGroupsData ?? []) as { id: string; name: string; archived_at?: string | null }[]
    )
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

    // Continuity: recent prior planeaciones for this group — continuity line (most recent),
    // Fichero de la Paz rotation (all fichas already used), and pausas rotation (last 2).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prevRows } = await (supabase as any)
      .from('fortnights')
      .select('number, project_name, monthly_value, plan_document, start_date')
      .eq('group_id', fn.group_id)
      .eq('plan_type', planType)
      .lt('start_date', fn.start_date)
      .order('start_date', { ascending: false })
      .limit(12)
    const prev = prevRows?.[0]
    if (prev) {
      const prevProj = (prev.plan_document?.nombre_proyecto as string) ?? prev.project_name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(fn as any).__continuity =
        `Planeación anterior (#${prev.number}): proyecto "${prevProj}", valor del mes "${prev.monthly_value}".`
    }

    // Fichero de la Paz + pausas rotation source: EVERY plan the teacher has generated
    // (any group/grade), by creation order. The old source reused prevRows, which filters
    // lt(start_date) — plans sharing a start_date (very common while testing, and legal in
    // real use) were invisible to each other, so every generation picked ficha 1.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rotationRows } = await (supabase as any)
      .from('fortnights')
      .select('plan_document')
      .eq('teacher_id', teacherId)
      .neq('id', fn.id)
      .not('plan_document', 'is', null)
      .order('created_at', { ascending: false })
      // Deep enough to remember every ficha in the catalogue: plans now burn up to 4 each.
      .limit(60)

    // Fichero de la Paz: pick fichas NOT used in past plans (code-side rotation, never LLM choice).
    // One per week — the estrategia comunitaria is a weekly activity, so a quincena gets 2 and a
    // month plan 4. A single ficha per plan made week 2 repeat week 1.
    const usedFichas = extractUsedFichas(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rotationRows ?? []).map((r: any) => r.plan_document?.estrategia_comunitaria as string)
    )
    const fichaWeeks = fn.is_month || fn.plan_type === 'mes' ? 4 : fn.plan_type === 'taller' ? 1 : 2
    const assignedFichas = pickFichas(usedFichas, fichaWeeks)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fn as any).__fichaBlock = buildFichaBlock(assignedFichas)

    // Pausas activas: expose the last 2 plans' pausas so the model rotates every 2 planeaciones.
    const prevPausas = (rotationRows ?? [])
      .slice(0, 2)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => String(r.plan_document?.pausas_activas ?? '').slice(0, 600))
      .filter(Boolean)
    if (prevPausas.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(fn as any).__pausasBlock =
        `<pausas_anteriores>\n${prevPausas.map((p: string, i: number) => `Planeación -${i + 1}:\n${p}`).join('\n\n')}\n</pausas_anteriores>`
    }

    // Load templates for this plan type — the teacher's OWN plus any shared with their school
    // (RLS returns both; no teacher_id filter). Prefer her own for STRUCTURE (own-first), and merge
    // the "VOZ DE LA MAESTRA" examples across all same-type templates for richer voice. A teacher
    // with no own format inherits the school's shared/official one.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: templates, error: templatesError } = await (supabase as any)
      .from('teacher_plan_templates')
      .select('id, template, teacher_id, is_school_official, created_at')
      .eq('plan_type', planType === 'mes' ? 'quincena' : planType)
      .order('created_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortedTemplateRows = ((templates ?? []) as any[])
      // Own formats first, then official school formats, then the rest.
      .sort(
        (a, b) =>
          Number(b.teacher_id === teacherId) - Number(a.teacher_id === teacherId) ||
          Number(!!b.is_school_official) - Number(!!a.is_school_official) ||
          (a.created_at < b.created_at ? 1 : -1)
      )
    const selectedTemplateId = (fn as { format_template_id?: string | null }).format_template_id
    const selectedTemplate = selectedTemplateId
      ? sortedTemplateRows.find((t) => t.id === selectedTemplateId)
      : sortedTemplateRows[0]
    // An older plan may still carry a template ID after the teacher switched to the system design.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useSystem = (fn as any).use_system_template === true
    if (templatesError && !useSystem)
      return NextResponse.json(
        { error: 'No se pudo consultar el formato elegido. Intenta de nuevo.' },
        { status: 503 }
      )
    if (!useSystem && selectedTemplateId && !selectedTemplate) {
      return NextResponse.json(
        {
          error:
            'El formato elegido ya no está disponible. Elige otro formato para esta planeación.',
        },
        { status: 409 }
      )
    }
    // If the teacher chose "Diseño de MaestraIA" for this plan, ignore their uploaded format.
    let profile: TeacherProfile | null = useSystem ? null : (selectedTemplate?.template ?? null)
    if (profile && !hasTemplateStructure(profile)) {
      return NextResponse.json(
        {
          error:
            'El formato guardado tiene una extracción incompleta. Vuelve a subirlo en Configuración antes de generar.',
        },
        { status: 409 }
      )
    }
    const evalColumns = profile?.evaluation_columns?.length
      ? profile.evaluation_columns
      : DEFAULT_EVAL_COLUMNS

    // Compute section order/titles from teacher's format for dynamic viewer rendering.
    const { sectionOrder, sectionTitles, customSectionNames } = buildSectionMeta(
      profile?.sections ?? []
    )

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const keepalive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'))
          } catch {
            /* stream closed */
          }
        }, 15_000)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'preparing' })}\n\n`))

        try {
          const generationSignal = AbortSignal.any([
            req.signal,
            AbortSignal.timeout(Math.max(1, deadline - Date.now())),
          ])

          // Use already-learned preferences only when no uploaded format governs this plan.
          // Refreshing learning invokes AI and must not delay the generation request.
          const learned =
            profile || useSystem ? null : await getLearnedProfile(supabase, teacherId, planType)
          const learnedSamples = learned?.profile?.writing_style_samples ?? []
          if (learnedSamples.length && !selectedTemplateId) {
            const merged = Array.from(
              new Set([...(profile?.writing_style_samples ?? []), ...learnedSamples])
            ).slice(0, 6)
            profile = { ...(profile ?? {}), writing_style_samples: merged }
          }

          // Fetch NEE students across ALL groups of the grade (plan is inclusive of every group).
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: students } = await (supabase as any)
            .from('students')
            .select('id, has_nee')
            .in('group_id', gradeGroupIds)
          // LFPDPPP: disability + name is sensitive data. NEVER pass real student names into the
          // prompt/output — anonymize to positional labels (Alumno A, B…). Names are not decrypted.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const neeRows = (students ?? []).filter((s: any) => s.has_nee)
          // Best-effort NEE notes, fetched separately so a missing column (migration 063 not pushed)
          // can't drop has_nee detection. Decrypt server-side, then SCRUB any names from the free text
          // before it can reach the LLM (the note describes support needs, tied only to "Alumno A").
          const notesById: Record<string, string> = {}
          if (neeRows.length) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: noteRows } = await (supabase as any)
                .from('students')
                .select('id, nee_notes_encrypted')
                .in(
                  'id',
                  neeRows.map((r: { id: string }) => r.id)
                )
              await Promise.all(
                (noteRows ?? []).map(
                  async (nr: { id: string; nee_notes_encrypted: string | null }) => {
                    if (!nr.nee_notes_encrypted) return
                    try {
                      notesById[nr.id] = scrubNames(await decrypt(nr.nee_notes_encrypted))
                    } catch {
                      /* undecryptable → omit */
                    }
                  }
                )
              )
            } catch {
              /* column missing → no notes, generation continues */
            }
          }
          const neeStudents = neeRows.map((s: { id: string }, i: number) => ({
            display_name: `Alumno ${i < 26 ? String.fromCharCode(65 + i) : String(i + 1)}`,
            nee_notes: notesById[s.id] ?? null,
          }))
          // Names-free label→student_id map, embedded in plan_document so the viewer/DOCX can decrypt &
          // swap real names at RENDER time only. plan_document is embedded for RAG, so it must hold NO
          // names — only ids. The LLM still sees only "Alumno A/B".
          const neeMapping: Record<string, string> = {}
          neeRows.forEach((s: { id: string }, i: number) => {
            neeMapping[`Alumno ${i < 26 ? String.fromCharCode(65 + i) : String(i + 1)}`] = s.id
          })

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
          // Keeps the FULL bank so the Números sub-plan (legitimately Saberes/matemático) stays grounded.
          // The complete available example (name-scrubbed at extraction) rides in the cached
          // prefix too: it's the highest-fidelity voice/structure/content exemplar we have, it's stable
          // across the main + sub-plan calls, and caching makes its ~7k tokens nearly free after the
          // first call. Older profiles without raw_text (pre-upgrade uploads) simply omit the block.
          const exampleBlock = templateContext(profile)
          const cachePrefix = `${NEM_SYNTHESIS}\n\n${nemGroundingBlock(includeProni, undefined, groupGrade)}${exampleBlock}\n\n${attachmentsBlock(fn)}`

          // Topic-relevance pre-selection: shortlist the contenidos that authentically fit THIS project's
          // theme so the main doc's campos_formativos stop including an irrelevant Saberes (Alejandra's #1).
          // Best-effort: empty block → prompt keeps full-bank behavior. Only the main quincena prompt uses it.
          // The teacher's extracted pda_bank is a selection HINT only (biases which contenidos get picked);
          // the official bank supplies all Contenido/PDA text, and enforceCamposFormativos guarantees it.
          // Smart auto-fill of the NEM dropdowns left blank (metodología / ejes), rotation-aware.
          // Fetch the teacher's recent plans' pedagogical choices so auto-picks vary from them
          // (relevance still wins). Best-effort; a failure leaves the prior behavior untouched.
          let recentChoices = {
            metodologias: [] as string[],
            ejes: [] as string[],
            contenidos: [] as string[],
          }
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: recentPlans } = await (supabase as any)
              .from('fortnights')
              .select('unidades_didacticas')
              .eq('teacher_id', teacherId)
              .neq('id', fn.id)
              .order('created_at', { ascending: false })
              .limit(6)
            const recentUnits = (recentPlans ?? []).flatMap(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (p: any) => (Array.isArray(p?.unidades_didacticas) ? p.unidades_didacticas : [])
            )
            recentChoices = extractRecentChoices(recentUnits)
          } catch (err) {
            console.error('[generate-document] recent-choices fetch failed:', err)
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unit0: any = Array.isArray(fn.unidades_didacticas)
            ? fn.unidades_didacticas[0]
            : null
          const requestedMethodology = unit0?.metodologia
          if (unit0) {
            const needMetodologia = !unit0.metodologia || unit0.metodologia === 'Automático'
            const needEjes = !(
              Array.isArray(fn.unidades_didacticas) &&
              fn.unidades_didacticas.some(
                (u: { ejes?: unknown }) => Array.isArray(u?.ejes) && u.ejes.length > 0
              )
            )
            if (needMetodologia || needEjes) {
              const auto = await autoSelectNem(
                String(fn.project_name ?? ''),
                `${String(fn.project_notes ?? '')} ${String(fn.learning_goal ?? '')}`.trim(),
                recentChoices,
                { metodologia: needMetodologia, ejes: needEjes },
                generationSignal
              )
              // Resolve 'Automático'/blank to a real methodology (fallback Proyecto) so the proyecto
              // structure + label are never the placeholder. Any OTHER unit still on 'Automático' → Proyecto.
              if (needMetodologia) unit0.metodologia = auto.metodologia ?? 'Proyecto'
              if (needEjes && auto.ejes?.length) unit0.ejes = auto.ejes
            }
            // Never leave the placeholder on any unit (extras that stayed 'Automático').
            if (Array.isArray(fn.unidades_didacticas)) {
              for (const u of fn.unidades_didacticas) {
                if (u && u.metodologia === 'Automático') u.metodologia = 'Proyecto'
              }
            }
          }

          fn.__mainHeadings = mainHeadings(
            requestedMethodology,
            profile,
            planType === 'taller' ? 'Taller Crítico' : (unit0?.metodologia ?? 'Proyecto')
          )

          // Teacher-selected contenidos (per unit) WIN: build the block verbatim from her choices.
          // Otherwise fall back to the Haiku topic-relevance shortlist (seeded with her learning goal,
          // and steered away from recently-used contenidos for variety).
          const teacherContenidoTitles: string[] = Array.isArray(unit0?.contenidos)
            ? unit0.contenidos
            : []
          // Each unit retains its own curriculum; pooling every unit polluted the main project.
          const teacherProcesos: Record<string, string[]> = {}
          for (const [contenido, list] of Object.entries(unit0?.procesos ?? {})) {
            if (Array.isArray(list))
              teacherProcesos[contenido] = list.filter((p): p is string => typeof p === 'string')
          }
          // Attachment RAG (migration 080): fetch the most relevant fragments of the attached files
          // for THIS project before building prompts. Best-effort; empty → flat block stays full-size.
          const attachmentKeys: string[] = (
            Array.isArray(fn.attachment_context) ? fn.attachment_context : []
          )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((a: any) => String(a?.key ?? a?.path ?? ''))
            .filter(Boolean)
          try {
            const attachKeys = attachmentKeys
            if (attachKeys.length) {
              // More files → more fragments (reglamentos + circulares + libros all deserve a slot).
              const k = Math.min(12, 4 + attachKeys.length * 2)
              const frags = await matchAttachmentChunks(
                supabase,
                teacherId,
                attachKeys,
                `${String(fn.project_name ?? '')} ${String(fn.project_notes ?? '')} ${String(fn.learning_goal ?? '')}`.trim(),
                k
              )
              // Section-aware retrieval for the sub-plans: their topics differ from the project's.
              const letterQuery = `letras ${[fn.letter_week1, fn.letter_week2, fn.letter_week3, fn.letter_week4].filter(Boolean).join(', ')} trazo vocabulario inglés lectoescritura`
              const numQuery = `números ${[fn.number_week1, fn.number_week2, fn.number_week3, fn.number_week4].filter(Boolean).join(', ')} conteo pensamiento matemático`
              const [fragsLetters, fragsNumeros] = await Promise.all([
                matchAttachmentChunks(supabase, teacherId, attachKeys, letterQuery, 4),
                matchAttachmentChunks(supabase, teacherId, attachKeys, numQuery, 4),
              ])
              const toBlock = (fs: { content: string }[], titulo: string) =>
                fs.length
                  ? `<fragmentos_de_archivos_${titulo}>\nFragmentos de los archivos adjuntos relevantes para esta sub-planeación — úsalos con prioridad (fechas, páginas y consignas VERBATIM):\n${fs.map((f) => `• ${f.content.slice(0, 1000)}`).join('\n\n')}\n</fragmentos_de_archivos_${titulo}>`
                  : ''
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(fn as any).__attachRagLetters = toBlock(fragsLetters, 'letters')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(fn as any).__attachRagNumeros = toBlock(fragsNumeros, 'numeros')
              if (frags.length) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(fn as any).__attachRag =
                  `<fragmentos_relevantes_de_archivos>\nFragmentos EXACTOS de los archivos adjuntos, los más relevantes para este proyecto — úsalos con prioridad (fechas, páginas y consignas VERBATIM):\n${frags.map((f) => `• ${f.content.slice(0, 1200)}`).join('\n\n')}\n</fragmentos_relevantes_de_archivos>`
              }
            }
          } catch (e) {
            console.error('[generate-document] attachment RAG skipped:', e)
          }

          const nemOpts = { grade: groupGrade, procesos: teacherProcesos }
          // The rows behind the block — also the deterministic fallback if the model returns no
          // campos_formativos (the contenidos+PDA table must ALWAYS precede the proyecto/taller).
          const selectedContenidoRows: ContenidoPDA[] = teacherContenidoTitles.length
            ? contenidosFromTitles(teacherContenidoTitles)
            : await selectRelevantContenidos(
                String(fn.project_name ?? ''),
                `${String(fn.project_notes ?? '')} ${String(fn.learning_goal ?? '')}`.trim(),
                (profile?.pda_bank ?? []).map((b) => String(b.contenido ?? '')).filter(Boolean),
                recentChoices.contenidos,
                generationSignal
              )
          if (!selectedContenidoRows.length)
            throw new Error(
              'No se reconocieron los contenidos elegidos. Revisa la selección de contenidos oficiales de la unidad.'
            )
          const contenidosBlock = contenidosSugeridosBlock(selectedContenidoRows, nemOpts)

          // RAG: retrieve THIS teacher's most-similar past plans → inject as style examples (her voice).
          // Best-effort; empty if no key / migration 054 not pushed / no prior plans.
          const styleExamples =
            profile || useSystem
              ? []
              : await matchPlaneaciones(supabase, {
                  queryText:
                    `${String(fn.project_name ?? '')} ${String(fn.monthly_value ?? '')}`.trim(),
                  teacherId,
                  excludeFortnight: fn.id,
                })
          // High-signal learned preferences (distilled from her corrections) — the accuracy lever.
          const prefsBlock = learned?.preferences?.trim()
            ? `<preferencias_aprendidas>\nPreferencias de ESTA maestra, aprendidas de sus correcciones anteriores. Respétalas:\n${learned.preferences.trim()}\n</preferencias_aprendidas>`
            : ''
          const styleBlock = [styleExamplesBlock(styleExamples), prefsBlock]
            .filter(Boolean)
            .join('\n\n')

          // NEM knowledge RAG: retrieve EXACT relevant passages from the institutional corpus
          // (context/*.md via migration 066) for THIS topic + methodology. Complements the always-on
          // NEM_SYNTHESIS/grounding (long-tail knowledge). Query-dependent → NOT in cachePrefix.
          // Best-effort: no key / migration not pushed / not ingested → empty block.
          const mainUnitMetodologia = Array.isArray(fn.unidades_didacticas)
            ? String(fn.unidades_didacticas[0]?.metodologia ?? '')
            : ''
          // Taller plans retrieve too — the corpus has Taller Crítico / metodología / evaluación
          // passages that ground them just as well as quincenas.
          const knowledgeQuery =
            planType === 'taller'
              ? `Taller Crítico ${String(fn.project_name ?? '')} ${String(fn.project_notes ?? '')} evaluación formativa preescolar`
              : `${mainUnitMetodologia} ${String(fn.project_name ?? '')} ${String(fn.project_notes ?? '')} evaluación formativa preescolar`
          const knowledgeBlock = nemKnowledgeBlock(
            await matchNemKnowledge(supabase, knowledgeQuery.trim())
          )

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
                  gameHint,
                  [knowledgeBlock, contenidosBlock, mainHeadingsBlock(fn.__mainHeadings)]
                    .filter(Boolean)
                    .join('\n\n')
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
                  gameHint,
                  contenidosBlock,
                  knowledgeBlock
                )

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'generating' })}\n\n`))
          // Generate bounded sections independently instead of one 4,000–6,000 word response.
          // All calls share a deadline so provider retries cannot outlive this server request.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const planDocument: Record<string, any> = await generateMainDocument({
            system: systemPrompt,
            context: userPrompt,
            planType,
            schedule: schedule.cronograma,
            customTitles: customSectionNames,
            separateReading: sectionOrder.includes('aventura_lectora'),
            expectedHeadings: fn.__mainHeadings,
            adjustmentHeadings: profile?.formatting_rules?.ajustes_subheadings?.length || 5,
            cachePrefix,
            signal: generationSignal,
            onRepair: () =>
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ phase: 'repairing' })}\n\n`)
              ),
          })

          // The selected official rows and full PDAs are known already. Copy them directly;
          // asking the model to reproduce the table wastes output and can omit entries.
          planDocument.campos_formativos = enforceCamposFormativos(
            selectedContenidoRows.map((row) => ({
              campo: row.campo,
              contenidos: [{ contenido: row.contenido, procesos: [] }],
            })),
            nemOpts
          )
          if (
            !Array.isArray(planDocument.campos_formativos) ||
            !planDocument.campos_formativos.length
          ) {
            throw new Error(
              'No pude completar la tabla de contenidos oficiales. Tu documento guardado se conserva; intenta de nuevo.'
            )
          }

          // Embed teacher's section order + titles so the viewer renders in the right order.
          if (sectionOrder.length) {
            planDocument._section_order = sectionOrder
            planDocument._section_titles = sectionTitles
          }
          if (profile && selectedTemplate) planDocument._format_template_id = selectedTemplate.id

          // Embed the detected formatting rules so the DOCX exporter can mirror them.
          if (profile?.formatting_rules) {
            planDocument._formatting_rules = profile.formatting_rules
          }
          // Names-free NEE label→id map for render-time name merge (never contains names).
          if (Object.keys(neeMapping).length) {
            planDocument._nee_mapping = neeMapping
          }
          // The enfoque the plan was written through — so the viewer, the DOCX export
          // and the editing chat all know the lens without re-reading the fortnight.
          const enfoqueName = enfoqueLabel(fn.pedagogical_approach)
          if (enfoqueName) planDocument._enfoque = enfoqueName

          // Quincena/Mes: auto-generate the Letters + Números sub-plans inline so the
          // document is a complete bundle on first generation (matches the teacher's format).
          // Run in parallel — they only depend on fortnight data, not on the main doc.
          if (planType !== 'taller') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ phase: 'subplanes' })}\n\n`)
            )
            // Sub-plans (Letters especially) must use the Richmond book vocab when present.
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
              evalColumns,
              cachePrefix,
              signal: generationSignal,
            }
            const requiredSubplan = (type: 'letter_number' | 'numeros') =>
              generateSubplan(fn, type, subOpts)
            const subPlanes: Record<string, unknown>[] = await Promise.all([
              requiredSubplan('letter_number'),
              requiredSubplan('numeros'),
            ])

            // Extra sub-plans (Taller, ABJ, etc.) beyond Proyecto + Letter&Number + Números.
            // Explicit units are all required, including additional Centros de Interés or
            // Proyectos. Their methodology alone does not make them Letters/Números duplicates.
            const extras = additionalUnits(fn.unidades_didacticas, profile?.subplan_inventory)
            if (extras.length) {
              for (let offset = 0; offset < extras.length; offset += 3) {
                const extraResults = await Promise.all(
                  extras.slice(offset, offset + 3).map(async (s) => {
                    // Unit-specific fragments: the reglamento shouldn't leak into a Taller de arte.
                    let ragBlock = ''
                    if (attachmentKeys.length) {
                      const frags = await matchAttachmentChunks(
                        supabase,
                        teacherId,
                        attachmentKeys,
                        `${s.nombre ?? ''} ${s.tema ?? ''} ${s.metodologia ?? ''}`.trim(),
                        4
                      )
                      if (frags.length) {
                        ragBlock = `<fragmentos_de_archivos_unidad>\nFragmentos de los archivos adjuntos relevantes para ESTA unidad — úsalos con prioridad (fechas, páginas y consignas VERBATIM):\n${frags.map((f) => `• ${f.content.slice(0, 1000)}`).join('\n\n')}\n</fragmentos_de_archivos_unidad>`
                      }
                    }
                    return generateCustomSubplan(
                      fn,
                      {
                        methodology: s.metodologia,
                        contenidos: s.contenidos,
                        procesos: s.procesos,
                        ejes: s.ejes,
                        name: s.nombre || s.metodologia,
                        notes:
                          [
                            s.tema && `Tema: ${s.tema}`,
                            s.dias && `Días con fechas: ${s.dias}`,
                            s.libros && `Libros/páginas: ${s.libros}`,
                          ]
                            .filter(Boolean)
                            .join('. ') || undefined,
                      },
                      { evalColumns, cachePrefix, ragBlock, signal: generationSignal }
                    )
                  })
                )
                subPlanes.push(...extraResults)
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
              const custom = (
                existingSubPlanes as Array<{ tipo?: string; nombre?: string }>
              ).filter(
                (s) =>
                  !['letter_number', 'numeros'].includes(s?.tipo ?? '') &&
                  !planDocument.sub_planes.some(
                    (generated: { tipo?: string; nombre?: string }) =>
                      generated.tipo === s.tipo && generated.nombre === s.nombre
                  )
              )
              ;(planDocument.sub_planes as unknown[]).push(...custom)
            }
          }

          // Store the requested content so warnings can be recomputed after edits, too.
          planDocument._health_expectations = {
            planType,
            fichaNumbers: assignedFichas.map((f) => f.numero),
            richmondSelected: !!richmondContent,
          }
          const healthIssues = checkPlanHealth(planDocument, planDocument._health_expectations)
          if (healthIssues.length) {
            console.warn('[generate-document] health:', JSON.stringify(healthIssues))
            planDocument._format_issues = healthIssues
          } else {
            delete planDocument._format_issues
          }
          const critical = healthIssues.filter((issue) => issue.severity === 'error')
          if (critical.length) {
            throw new Error(
              `La planeación quedó incompleta (${critical.map((i) => i.section).join(', ')}). No se guardó esta versión; intenta generar de nuevo.`
            )
          }

          // Persist the evaluation columns so the viewer + DOCX export render this school's scale.
          planDocument.evaluation_columns = evalColumns

          // Normalize every section to a consistent shape (strings where strings are expected) so
          // the saved document always renders + exports completely — never a blank/half section.
          const normalized = normalizePlanDocument(planDocument)

          // Save plan_document to fortnight
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: saved, error: saveError } = await (supabase as any).rpc(
            'save_plan_document_if_unchanged',
            {
              plan_id: fn.id,
              expected_document: fn.plan_document ?? null,
              new_document: normalized,
            }
          )
          if (saveError) throw saveError
          if (!saved)
            throw new Error(
              'La planeación cambió mientras se generaba. Conservamos tus cambios; actualiza la página antes de intentar de nuevo.'
            )

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
          const msg =
            err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
              ? 'La generación tardó demasiado. Tu documento guardado se conserva; intenta de nuevo.'
              : err instanceof Error
                ? err.message
                : String(err)
          console.error('[generate-document] error:', msg)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        } finally {
          clearInterval(keepalive)
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
