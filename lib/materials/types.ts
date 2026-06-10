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

  const letter: string =
    dayNumber <= 5
      ? fortnight?.letter_week1 || 'A'
      : fortnight?.letter_week2 || fortnight?.letter_week1 || 'A'

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

export function autoMatchingLevel(grade: string): 'medio' | 'alto' {
  return grade.includes('kinder') ? 'medio' : 'alto'
}

export function autoDifficulty(grade: string): 'kinder' | 'standard' {
  return grade.includes('kinder') ? 'kinder' : 'standard'
}
