// Richmond Unit Overview — pre-seeded English book catalog (read-only).

export type RichmondUnit = {
  id: string
  book_code: string
  unit_number: number
  unit_title: string
}

export type RichmondLessonGroup = {
  id: string
  unit_id: string
  lesson_range: string
  lesson_start: number
  lesson_end: number
  learning_goals: string[]
  vocabulary: string[]
  language_models: string[]
  sort_order: number
}

export type RichmondUnitWithGroups = RichmondUnit & {
  lesson_groups: RichmondLessonGroup[]
}

// Flat, resolved content merged across the selected lesson groups — used in prompt assembly + UI.
export type SelectedRichmondContent = {
  book_code: string
  unit_number: number
  unit_title: string
  lesson_ranges: string[]
  vocabulary: string[]
  language_models: string[]
  learning_goals: string[]
}
