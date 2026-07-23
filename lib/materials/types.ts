export type FortnightContext = {
  project_name: string
  monthly_value: string | null
  richmond_unit: string | null
  richmond_student_pages: string | null
  letter: string
  grade: string
  methodology_types: string[] | null
  // Richmond unit learning goals — materials should PRACTICE these, not just use the words.
  learning_goals?: string[]
}

// Shared "Contexto de clase" prompt block for material builders (was copy-pasted per builder).
// Including the unit's learning goals aligns games with what the unit teaches, not just its words.
export function classContextBlock(context: FortnightContext | null | undefined): string {
  if (!context) return ''
  const goals = context.learning_goals?.length
    ? `\n- Metas de aprendizaje de la unidad (la actividad debe practicarlas):\n${context.learning_goals
        .slice(0, 6)
        .map((g) => `  • ${g}`)
        .join('\n')}`
    : ''
  return `Contexto de clase:\n- Proyecto: ${context.project_name}\n- Unidad Richmond: ${context.richmond_unit ?? 'N/A'}\n- Valor del mes: ${context.monthly_value ?? 'N/A'}${goals}\n\n`
}

// All focus letters of the fortnight — both weeks, comma-lists ("A, B") split and trimmed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fortnightLetters(fortnight: any): string[] {
  return [fortnight?.letter_week1, fortnight?.letter_week2].filter(Boolean).flatMap((l: unknown) =>
    String(l)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deriveFortnightContext(lessonPlan: any): FortnightContext {
  const fortnight = lessonPlan?.fortnights ?? {}
  // grade lives on fortnights since migration 059; groups.grade kept as fallback for old joins.
  const grade: string = (fortnight?.grade ?? fortnight?.groups?.grade ?? '').toLowerCase()
  const dayNumber: number = lessonPlan?.day_number ?? 1

  // letter_week fields can be comma-separated ("A, B") — take the first letter for single-letter contexts.
  const firstLetter = (v: unknown) =>
    String(v ?? '')
      .split(',')[0]
      .trim()
  const letter: string =
    (dayNumber <= 5
      ? firstLetter(fortnight?.letter_week1)
      : firstLetter(fortnight?.letter_week2) || firstLetter(fortnight?.letter_week1)) || 'A'

  return {
    project_name: fortnight?.project_name ?? '',
    monthly_value: fortnight?.monthly_value ?? null,
    richmond_unit: fortnight?.richmond_unit ?? null,
    richmond_student_pages: fortnight?.richmond_student_pages ?? null,
    letter,
    grade,
    methodology_types: fortnight?.methodology_types ?? null,
  }
}
