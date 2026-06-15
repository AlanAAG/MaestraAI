type DayPlan = {
  day_number: number
  date: string
  day_of_week: string
  methodology: string
  blocks: unknown[]
  vocabulary: string[]
  observation_students: string[]
  nee_reminders: string[]
}

const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes']

export function parseClaudeResponse(text: string, startDate: string): DayPlan[] {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/)
  const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('Failed to parse Claude response')
  }

  if (!Array.isArray(parsed)) throw new Error('Claude response is not a JSON array')

  const start = new Date(startDate)
  const plans: DayPlan[] = []

  for (let i = 0; i < 10; i++) {
    const dayData = parsed[i] as Record<string, unknown> | undefined
    const currentDate = new Date(start)

    // Skip weekends: every 5 school days add 2 calendar days for the weekend
    currentDate.setDate(start.getDate() + i + Math.floor(i / 5) * 2)

    plans.push({
      day_number: i + 1,
      date: currentDate.toISOString().split('T')[0],
      day_of_week: DAY_NAMES[i % 5],
      methodology: (dayData?.methodology as string) || 'project_based',
      blocks: (dayData?.blocks as unknown[]) || [],
      vocabulary: (dayData?.vocabulary as string[]) || [],
      observation_students: (dayData?.observation_students as string[]) || [],
      nee_reminders: (dayData?.nee_reminders as string[]) || [],
    })
  }

  return plans
}
