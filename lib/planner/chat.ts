/**
 * Conversational editing of a generated planeación.
 *
 * The teacher talks to the assistant about the draft; the assistant answers, and
 * when she asks for a change it rewrites the affected section(s) via tool use.
 *
 * Why targeted section rewrites rather than regenerating the whole document:
 * a quincena plan runs 4,000-6,000 words. Regenerating it per turn would be slow,
 * expensive, and would churn content the teacher was happy with. Section rewrites
 * reuse the write path that regenerate-section already proved out.
 */
import { FEEDBACK_SECTIONS } from './feedback'
import { listCustomSections, type CustomSection } from './custom-sections'

type CampoFormativo = { campo?: string; contenidos?: { contenido?: string }[] }

/** Sections the chat may rewrite. Narrative prose only. */
export const CHAT_EDITABLE_SECTION_LIST = [
  ...Array.from(FEEDBACK_SECTIONS),
  'nombre_proyecto',
] as const
export const CHAT_EDITABLE_SECTIONS = new Set<string>(CHAT_EDITABLE_SECTION_LIST)

/** Human labels, so the model and the teacher talk about sections the same way. */
export const SECTION_LABELS: Record<string, string> = {
  nombre_proyecto: 'Nombre del proyecto',
  actividades_iniciales: 'Actividades iniciales',
  actividades_rutina: 'Actividades de rutina',
  aventura_lectora: 'Aventura lectora',
  estrategia_comunitaria: 'Estrategia comunitaria',
  pausas_activas: 'Pausas activas',
  ajustes_razonables: 'Ajustes razonables',
  ejes_articuladores: 'Ejes articuladores',
  proyecto: 'Proyecto',
  desarrollo_taller: 'Desarrollo del taller',
}

export const MAX_TURNS = 20
/** Per-section cap sent to the model — keeps a long plan inside a sane context. */
const SECTION_EXCERPT_CHARS = 6000

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

/**
 * What the model is allowed to change, and what it must leave alone.
 *
 * `campos_formativos`, `cronograma`, `evaluacion_items` and `sub_planes` are
 * enforced in code (snapped to the official contenidos bank) — letting the model
 * rewrite them would silently break that guarantee.
 */
export const CHAT_SYSTEM = `Eres la asistente pedagógica de MaestraIA. La maestra ya generó una planeación de preescolar (NEM 2024, México) y ahora la está afinando contigo: corregir lo que salió mal, agregar lo que falta, quitar lo que sobra, mejorar lo que quedó flojo y explorar ideas nuevas.

CÓMO TRABAJAS
- Español, tono de colega con experiencia: directa, cálida, sin cursilerías ni relleno.
- PREGUNTA o petición de ideas → contesta y propón. NO edites nada todavía. Cierra ofreciendo aplicarlo ("¿Te lo dejo así en el documento?").
- PETICIÓN DE CAMBIO clara → aplícala con las herramientas y di en una o dos frases qué cambiaste.
- Un cambio puede tocar varias secciones: llama a la herramienta una vez por sección.
- Si la petición es ambigua o muy amplia ("mejóralo todo"), pregunta qué le incomoda antes de reescribir. Nunca hagas un cambio grande adivinando.

CORREGIR ERRORES
- Ves el documento COMPLETO, incluidas las secciones que no puedes editar. Úsalo: si algo no cuadra entre secciones (el proyecto habla de una cosa y la evaluación de otra, el cronograma no refleja las actividades, un día no coincide con el horario del grupo), DILO aunque no te lo hayan preguntado.
- Si el error está en una sección bloqueada, explícale en qué parte del formulario de la planeación se corrige. No intentes editarla.

AGREGAR Y QUITAR
- agregar_seccion crea una sección propia de la maestra (una que su escuela pide y no es estándar). No la uses para contenido que pertenece a una sección existente.
- eliminar_seccion borra una sección propia completa. Para quitar solo una parte de una sección, usa editar_seccion y devuelve el texto sin esa parte.
- Antes de eliminar algo, confirma con ella. Borrar no se deshace desde el chat.

AL REESCRIBIR UNA SECCIÓN
- Devuelve la sección COMPLETA, en markdown, con el mismo formato que ya tenía: viñetas "- ", subtítulos en **negritas**, tono operativo en primera persona ("Voy a...", "Les pido que...").
- Conserva todo lo que la maestra NO pidió cambiar. No aproveches para reescribir de más.
- Mantén la terminología NEM y el nivel de detalle del resto del documento.

REGLAS QUE NO SE ROMPEN
- NUNCA inventes ni menciones Contenidos o PDA nuevos. El desglose oficial viene del banco verbatim y vive en secciones que no puedes tocar.
- NUNCA uses calificaciones numéricas, porcentajes ni lenguaje de puntaje. La evaluación es cualitativa: Logrado / En proceso / Requiere apoyo / Sin evaluar.
- Si el texto usa etiquetas anónimas de alumnos ("Alumno A", "Alumno B"), consérvalas EXACTAMENTE. NUNCA escribas nombres reales de niños.
- Las actividades deben ser realistas para la edad del grupo.
- No puedes editar campos formativos, cronograma, aspectos a evaluar ni sub-planes: el sistema los fija contra el banco oficial.`

export const EDIT_TOOL = {
  name: 'editar_seccion',
  description:
    'Reescribe una sección narrativa existente. Úsala para corregir, mejorar, agregar contenido dentro de una sección o quitar una parte de ella. Devuelve siempre el texto COMPLETO de la sección, no un fragmento ni un diff.',
  input_schema: {
    type: 'object' as const,
    properties: {
      seccion: {
        type: 'string' as const,
        enum: CHAT_EDITABLE_SECTION_LIST,
        description: 'Clave de la sección a reescribir.',
      },
      contenido: {
        type: 'string' as const,
        description:
          'El texto nuevo y completo de la sección, en markdown, conservando el formato original.',
      },
    },
    required: ['seccion', 'contenido'],
  },
}

export const ADD_TOOL = {
  name: 'agregar_seccion',
  description:
    'Crea una sección NUEVA propia de la maestra, para contenido que no pertenece a ninguna sección existente. Si el contenido cabe en una sección que ya existe, usa editar_seccion en su lugar.',
  input_schema: {
    type: 'object' as const,
    properties: {
      titulo: {
        type: 'string' as const,
        description: 'Título de la sección, como aparecerá en el documento.',
      },
      contenido: {
        type: 'string' as const,
        description: 'Contenido de la sección en markdown, con el mismo estilo que el resto.',
      },
    },
    required: ['titulo', 'contenido'],
  },
}

export const REMOVE_TOOL = {
  name: 'eliminar_seccion',
  description:
    'Elimina por completo una sección propia de la maestra. Solo funciona con las secciones propias listadas en el documento — las secciones estándar no se pueden eliminar. Confirma con ella antes de usarla.',
  input_schema: {
    type: 'object' as const,
    properties: {
      titulo: {
        type: 'string' as const,
        description: 'Título exacto de la sección propia a eliminar.',
      },
    },
    required: ['titulo'],
  },
}

export const CHAT_TOOLS = [EDIT_TOOL, ADD_TOOL, REMOVE_TOOL]

const excerpt = (raw: string) =>
  raw.length > SECTION_EXCERPT_CHARS ? `${raw.slice(0, SECTION_EXCERPT_CHARS)}\n[…recortado…]` : raw

/**
 * Renders the current draft for the model.
 *
 * Editable sections come through in full. The enforced ones (campos formativos,
 * cronograma, aspectos a evaluar) are included too, marked read-only: the model
 * can't rewrite them, but it needs to see them to catch the inconsistencies this
 * chat exists to fix — a proyecto that doesn't match its evaluation, a cronograma
 * that doesn't reflect the activities. Withholding them made it blind to exactly
 * the mistakes a teacher would ask about.
 */
export function buildPlanContext(planDocument: Record<string, unknown>): string {
  const editable = CHAT_EDITABLE_SECTION_LIST.filter(
    (key) => typeof planDocument[key] === 'string' && (planDocument[key] as string).trim()
  )
    .map(
      (key) =>
        `<seccion clave="${key}" titulo="${SECTION_LABELS[key] ?? key}" editable="si">\n${excerpt(
          (planDocument[key] as string).trim()
        )}\n</seccion>`
    )
    .join('\n\n')

  const custom = listCustomSections(planDocument)
    .map((title, i) => {
      const cs = (planDocument.custom_sections as CustomSection[])[i]
      return `<seccion_propia titulo="${title}" editable="si">\n${excerpt(
        (cs?.content ?? '').trim()
      )}\n</seccion_propia>`
    })
    .join('\n\n')

  const campos = Array.isArray(planDocument.campos_formativos)
    ? (planDocument.campos_formativos as CampoFormativo[])
        .map(
          (c) =>
            `  • ${c?.campo ?? ''}\n${(c?.contenidos ?? [])
              .map((ct) => `    - ${ct?.contenido ?? ''}`)
              .join('\n')}`
        )
        .join('\n')
    : ''

  const cronograma =
    planDocument.cronograma && typeof planDocument.cronograma === 'object'
      ? Object.entries(planDocument.cronograma as Record<string, string[]>)
          .map(([day, items]) => `  • ${day}: ${(items ?? []).join(' | ')}`)
          .join('\n')
      : ''

  const evaluacion = Array.isArray(planDocument.evaluacion_items)
    ? (planDocument.evaluacion_items as { aspecto?: string }[])
        .map((e) => `  • ${e?.aspecto ?? ''}`)
        .join('\n')
    : ''

  const locked = [
    planDocument.metodologia && `Metodología: ${planDocument.metodologia}`,
    // Stamped at generation. A rewrite that ignores it drifts out of the school's
    // approach — a Montessori plan gaining teacher-directed activities, say.
    planDocument._enfoque &&
      `Enfoque pedagógico: ${planDocument._enfoque}. Cualquier texto que reescribas debe seguir siendo coherente con este enfoque.`,
    campos && `Campos formativos y contenidos oficiales:\n${campos}`,
    cronograma && `Cronograma:\n${cronograma}`,
    evaluacion && `Aspectos a evaluar:\n${evaluacion}`,
    Array.isArray(planDocument.sub_planes) &&
      (planDocument.sub_planes as unknown[]).length > 0 &&
      `Sub-planes adjuntos: ${(planDocument.sub_planes as { tipo?: string }[])
        .map((s) => s?.tipo)
        .filter(Boolean)
        .join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const body = [editable, custom].filter(Boolean).join('\n\n')

  return `<planeacion nombre="${String(planDocument.nombre_proyecto ?? 'Sin nombre')}">
${
  locked
    ? `<sin_editar razon="fijado por el sistema contra el banco oficial — puedes comentarlo, no cambiarlo">\n${locked}\n</sin_editar>\n`
    : ''
}
${body || '(La planeación aún no tiene secciones narrativas.)'}
</planeacion>`
}

/** Trims history to the last N turns — the plan itself carries the real state. */
export function trimTurns(turns: ChatTurn[], max = MAX_TURNS): ChatTurn[] {
  return turns.slice(-max)
}
