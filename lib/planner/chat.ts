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
export const CHAT_SYSTEM = `Eres la asistente pedagógica de MaestraIA. La maestra acaba de generar una planeación de preescolar (NEM 2024, México) y quiere conversarla contigo para afinarla.

TU TRABAJO
- Responde en español, con la calidez y concisión de una colega con experiencia. Sin cursilerías.
- Si la maestra hace una PREGUNTA, contéstala. No edites nada.
- Si la maestra PIDE UN CAMBIO, usa la herramienta editar_seccion para reescribir la(s) sección(es) afectada(s), y luego dile en una o dos frases qué cambiaste.
- Si el cambio toca varias secciones, llama a la herramienta una vez por sección.
- Si no queda claro qué sección quiere cambiar, pregunta antes de editar. Nunca adivines a lo grande.

AL REESCRIBIR UNA SECCIÓN
- Devuelve la sección COMPLETA, en markdown, con el mismo formato que ya tenía: viñetas "- ", subtítulos en **negritas**, tono operativo en primera persona ("Voy a...", "Les pido que...").
- Conserva todo lo que la maestra NO pidió cambiar. No aproveches para reescribir de más.
- Mantén la terminología NEM y el nivel de detalle del resto del documento.

REGLAS QUE NO SE ROMPEN
- NUNCA inventes ni menciones Contenidos o PDA nuevos. El desglose oficial vive en otras secciones que tú no puedes tocar.
- NUNCA uses calificaciones numéricas, porcentajes ni lenguaje de puntaje. La evaluación es cualitativa: Logrado / En proceso / Requiere apoyo / Sin evaluar.
- Si el texto usa etiquetas anónimas de alumnos ("Alumno A", "Alumno B"), consérvalas EXACTAMENTE. NUNCA escribas nombres reales de niños.
- No puedes editar los campos formativos, el cronograma, los aspectos a evaluar ni los sub-planes: están fijados por el sistema contra el banco oficial. Si la maestra pide un cambio ahí, explícale que eso se ajusta desde el formulario de la planeación.`

export const EDIT_TOOL = {
  name: 'editar_seccion',
  description:
    'Reescribe una sección narrativa de la planeación. Úsala solo cuando la maestra pida explícitamente un cambio. Devuelve siempre el texto COMPLETO de la sección, no un fragmento ni un diff.',
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

/**
 * Renders the current draft for the model: only the sections it can edit, each
 * excerpted, so a long plan doesn't blow the context. Structured/enforced fields
 * are summarised as read-only context rather than dumped in full.
 */
export function buildPlanContext(planDocument: Record<string, unknown>): string {
  const editable = CHAT_EDITABLE_SECTION_LIST.filter(
    (key) => typeof planDocument[key] === 'string' && (planDocument[key] as string).trim()
  )
    .map((key) => {
      const raw = (planDocument[key] as string).trim()
      const text =
        raw.length > SECTION_EXCERPT_CHARS
          ? `${raw.slice(0, SECTION_EXCERPT_CHARS)}\n[…recortado…]`
          : raw
      return `<seccion clave="${key}" titulo="${SECTION_LABELS[key] ?? key}">\n${text}\n</seccion>`
    })
    .join('\n\n')

  const campos = Array.isArray(planDocument.campos_formativos)
    ? (planDocument.campos_formativos as { campo?: string }[])
        .map((c) => c?.campo)
        .filter(Boolean)
        .join(', ')
    : ''

  const readOnly = [
    campos && `Campos formativos (fijados, no editables): ${campos}`,
    planDocument.metodologia && `Metodología: ${planDocument.metodologia}`,
    Array.isArray(planDocument.sub_planes) &&
      (planDocument.sub_planes as unknown[]).length > 0 &&
      `Sub-planes adjuntos: ${(planDocument.sub_planes as { tipo?: string }[])
        .map((s) => s?.tipo)
        .filter(Boolean)
        .join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `<planeacion nombre="${String(planDocument.nombre_proyecto ?? 'Sin nombre')}">
${readOnly ? `<contexto_fijo>\n${readOnly}\n</contexto_fijo>\n` : ''}
${editable || '(La planeación aún no tiene secciones narrativas.)'}
</planeacion>`
}

/** Trims history to the last N turns — the plan itself carries the real state. */
export function trimTurns(turns: ChatTurn[], max = MAX_TURNS): ChatTurn[] {
  return turns.slice(-max)
}
