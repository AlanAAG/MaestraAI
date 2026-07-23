// Pure worksheet content shape + normalization — safe to import from client components
// (lib/materials/worksheets.ts pulls in the Anthropic SDK, so renderers import from here).

// Mirrors the JSON shape WORKSHEETS_PROMPT actually requests (prompts/materials.ts).
export type WorksheetItem = {
  word: string
  teacher_instruction?: string
  correct_image_query?: string
  foil_words?: string[]
  foil_image_queries?: string[]
}

export type WorksheetActivity = {
  type: 'matching' | 'coloring' | 'circling' | 'sequencing'
  title: string
  teacher_instruction: string
  items?: WorksheetItem[]
  // translation is the current shape; description was the pre-rework pair field.
  pairs?: Array<{ word: string; image_query?: string; translation?: string; description?: string }>
}

export type WorksheetContent = {
  activities: WorksheetActivity[]
}

// Old stored content has items: string[]; current prompt emits objects. One rule for both renderers
// (detail page + PDF) so screen and print can't drift.
export function normalizeWorksheetItems(items: unknown): WorksheetItem[] {
  if (!Array.isArray(items)) return []
  return items.map((it) => (typeof it === 'string' ? { word: it } : (it as WorksheetItem)))
}
