import type {
  RichmondUnit,
  RichmondLessonGroup,
  RichmondUnitWithGroups,
  SelectedRichmondContent,
} from './types'

// Loosely-typed client (matches the codebase's `(supabase as any)` access pattern); works with
// both the server and browser Supabase clients (richmond_* tables are public-read via RLS).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const dedupe = (arr: string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of arr) {
    const v = (raw ?? '').trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

export async function getUnitsByBook(supabase: DB, bookCode: string): Promise<RichmondUnit[]> {
  const { data, error } = await supabase
    .from('richmond_units')
    .select('id, book_code, unit_number, unit_title')
    .eq('book_code', bookCode)
    .order('unit_number', { ascending: true })
  if (error) return []
  return (data ?? []) as RichmondUnit[]
}

export async function getUnitWithGroups(
  supabase: DB,
  unitId: string
): Promise<RichmondUnitWithGroups | null> {
  const { data: unit, error } = await supabase
    .from('richmond_units')
    .select('id, book_code, unit_number, unit_title')
    .eq('id', unitId)
    .single()
  if (error || !unit) return null
  const { data: groups } = await supabase
    .from('richmond_lesson_groups')
    .select(
      'id, unit_id, lesson_range, lesson_start, lesson_end, learning_goals, vocabulary, language_models, sort_order'
    )
    .eq('unit_id', unitId)
    .order('sort_order', { ascending: true })
  return { ...(unit as RichmondUnit), lesson_groups: (groups ?? []) as RichmondLessonGroup[] }
}

// Pure: merge the selected lesson groups of a unit into flat, deduped content. Unit-test target.
export function mergeSelectedContent(
  unit: RichmondUnitWithGroups,
  lessonGroupIds: string[]
): SelectedRichmondContent {
  const idSet = new Set(lessonGroupIds)
  const selected = unit.lesson_groups
    .filter((g) => idSet.has(g.id))
    .sort((a, b) => a.sort_order - b.sort_order)
  return {
    book_code: unit.book_code,
    unit_number: unit.unit_number,
    unit_title: unit.unit_title,
    lesson_ranges: selected.map((g) => g.lesson_range),
    vocabulary: dedupe(selected.flatMap((g) => g.vocabulary)),
    language_models: dedupe(selected.flatMap((g) => g.language_models)),
    learning_goals: dedupe(selected.flatMap((g) => g.learning_goals)),
  }
}

export async function resolveSelectedContent(
  supabase: DB,
  unitId: string,
  lessonGroupIds: string[]
): Promise<SelectedRichmondContent | null> {
  const unit = await getUnitWithGroups(supabase, unitId)
  if (!unit) return null
  return mergeSelectedContent(unit, lessonGroupIds)
}
