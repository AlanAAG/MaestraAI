// Pure helpers for plan feedback (global rating + Word-style section comments).
// The routes stay thin; anything with logic lives here so it's testable.

export type FeedbackRow = {
  section_key: string | null
  rating: number | null
  comment: string | null
}

// Narrative sections a comment can attach to (mirrors EDITABLE_SECTIONS in
// app/api/planner/update-document/route.ts, minus structured/meta fields).
export const FEEDBACK_SECTIONS = new Set([
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'ejes_articuladores',
  'proyecto',
  'desarrollo_taller',
])

/** Upsert conflict target — must match the partial unique indexes in migration 070. */
export function feedbackConflictTarget(sectionKey: string | null): string {
  return sectionKey ? 'fortnight_id,teacher_id,section_key' : 'fortnight_id,teacher_id'
}
