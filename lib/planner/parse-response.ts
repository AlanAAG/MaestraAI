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

export function parsePlanResponse(text: string, startDate: string): DayPlan[] {
  // Extract JSON from markdown code blocks if present
  // Try direct JSON before accepting a markdown wrapper.
  let parsed: unknown
  try {
    parsed = JSON.parse(text.trim())
  } catch {
    // Fall back to regex extraction for markdown-wrapped or prefixed responses
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) ||
      text.match(/\{"days"[\s\S]*\}/) ||
      text.match(/\[[\s\S]*\]/)
    const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      throw new Error('Failed to parse plan response')
    }
  }

  // Plan generation returns an object with a days array.
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'days' in parsed) {
    parsed = (parsed as Record<string, unknown>).days
  }

  if (!Array.isArray(parsed)) throw new Error('Plan response is not a JSON array')
  if (parsed.length !== 10) throw new Error('La IA no generó los 10 días de la planeación')
  if (parsed.some((day) => !day || !Array.isArray(day.blocks) || day.blocks.length === 0)) {
    throw new Error('La IA devolvió un día sin actividades')
  }

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
