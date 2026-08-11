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

/** DB sentinel for global (whole-document) feedback — '' because partial unique indexes can't be upsert targets. */
export const GLOBAL_SECTION = ''

/** Upsert conflict target — must match the plain unique index in migration 071. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function feedbackConflictTarget(sectionKey: string | null): string {
  return 'fortnight_id,teacher_id,section_key'
}
