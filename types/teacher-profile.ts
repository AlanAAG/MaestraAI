// Rich profile extracted from a teacher's uploaded planeación format.
// Stored in teacher_plan_templates.template (JSONB). Legacy fields (sections/activity_blocks/
// block_descriptions/examples) are kept optional so older stored templates still work.
export type TeacherProfile = {
  // Document structure
  sections?: string[]
  sub_plan_types?: string[] // ["Proyecto", "Centro de Interés", "Taller Crítico", ...]
  // The example's sub-plan inventory: which sub-plans it contains, so generation mirrors it.
  subplan_inventory?: Array<{ metodologia: string; nombre?: string; secciones?: string[] }>
  evaluation_columns?: string[] // e.g. ["Sí", "No", "Proceso"] or ["Logrado", "En proceso", "Requiere apoyo"]

  // Writing voice (the most important few-shot material)
  writing_style_samples?: string[] // verbatim excerpts, ≥250 chars each — generic fallback
  // Per-section labeled samples. Keys match plan_document field names (proyecto, actividades_iniciales…)
  section_samples?: Record<string, string>
  actividades_iniciales_example?: string
  actividades_rutina_example?: string
  estrategia_comunitaria_example?: string

  // PDA bank — anti-hallucination core
  pda_bank?: Array<{
    campo: string
    contenido: string
    pdas: string[]
  }>

  // School-specific identifiers
  school_specifics?: {
    book_series?: string
    special_programs?: string[]
    valor_del_mes_format?: string
  }

  // Formatting signals detected in the uploaded doc — drive generation markdown + Word rendering
  // so the output matches the teacher's format (bold labels, numbered steps, sub-headings, etc.).
  formatting_rules?: {
    bullet_label_bold?: boolean
    section_title_case?: 'ALL_CAPS' | 'Title Case' | 'Sentence case'
    estrategia_comunitaria_format?: 'numbered_steps' | 'paragraphs'
    ejes_articuladores_format?: 'bold_label_paragraph' | 'plain'
    proyecto_subheadings?: string[]
    ajustes_subheadings?: string[]
    section_separator?: 'line' | 'none' | 'space'
    // Heading level the teacher uses for EVERY main section (flat 'h1' vs nested 'h2').
    // Neutral default when absent/unsure: 'h2'.
    section_heading_level?: 'h1' | 'h2'
    section_title_trailing_colon?: boolean // "Actividades Iniciales:" vs "Actividades Iniciales"
    // Where campos formativos live: as one top-level block, or a table inside EACH sub-plan.
    // Neutral default when absent: 'top_level' (current behavior).
    campos_position?: 'top_level' | 'per_subplan'
  }

  verb_person?: 'primera_singular' | 'primera_plural' | 'infinitivo'
  notes?: string

  // Legacy fields (older extractions) — still consumed as a fallback.
  activity_blocks?: string[]
  block_descriptions?: Record<string, string>
  examples?: string[]
}

export const DEFAULT_EVAL_COLUMNS = ['Logrado', 'En proceso', 'Requiere apoyo']
