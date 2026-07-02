export type FortnightContext = {
  project_name: string
  monthly_value: string | null
  richmond_unit: string | null
  richmond_student_pages: string | null
  letter: string
  grade: string
  methodology_types: string[] | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deriveFortnightContext(lessonPlan: any): FortnightContext {
  const fortnight = lessonPlan?.fortnights ?? {}
  const grade: string = (fortnight?.groups?.grade ?? '').toLowerCase()
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
