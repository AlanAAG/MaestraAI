// lib/pdf-planeacion.ts
// Pure data functions for planeacion PDF generation (testable, no side effects)

type LessonBlock = {
  time: string
  activity: string
  methodology: string
  materials: string[]
  nem_field: string
  nem_axis: string
}

type LessonPlan = {
  id: string
  day_number: number
  date: string
  day_of_week: string
  blocks: LessonBlock[]
  vocabulary: string[]
  observation_students: string[]
  nee_reminders: string[]
}

type Fortnight = {
  id: string
  number: number
  start_date: string
  end_date: string
  project_name: string
  monthly_value: string
  letter_week1: string
  letter_week2: string
}

type Group = {
  name: string
  grade: string
}

type School = {
  name: string
}

export interface PlaneacionDocumentProps {
  fortnightNumber: number
  projectName: string
  monthlyValue: string
  dateRange: string
  groupName: string
  grade: string
  schoolName: string
  lessonPlans: Array<{
    dayNumber: number
    dayLabel: string
    date: string
    dateFormatted: string
    blocks: Array<{
      time: string
      activity: string
      methodology: string
      materials: string
      nemField: string
      nemAxis: string
    }>
    vocabulary: string
    observations: string
    neeReminders: string[]
  }>
  generatedAt: string
}

/**
 * Builds PDF document props from raw database data.
 * Pure function — no side effects.
 */
export function buildPlaneacionPdfProps(input: {
  fortnight: Fortnight
  lessonPlans: LessonPlan[]
  group: Group
  school: School
}): PlaneacionDocumentProps {
  const { fortnight, lessonPlans, group, school } = input

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    })

  const formatDateShort = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Mexico_City',
    })

  const getDayLabel = (dayNumber: number): string => {
    const weekDay = ((dayNumber - 1) % 5) + 1
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    return days[weekDay - 1]
  }

  return {
    fortnightNumber: fortnight.number,
    projectName: fortnight.project_name,
    monthlyValue: fortnight.monthly_value,
    dateRange: `${formatDate(fortnight.start_date)} al ${formatDate(fortnight.end_date)}`,
    groupName: group.name,
    grade: group.grade,
    schoolName: school.name,
    lessonPlans: lessonPlans.map((plan) => ({
      dayNumber: plan.day_number,
      dayLabel: getDayLabel(plan.day_number),
      date: plan.date,
      dateFormatted: formatDateShort(plan.date),
      blocks: plan.blocks.map((block) => ({
        time: block.time,
        activity: block.activity,
        methodology: block.methodology,
        materials: block.materials.join(', '),
        nemField: block.nem_field,
        nemAxis: block.nem_axis,
      })),
      vocabulary: plan.vocabulary.join(', '),
      observations:
        plan.observation_students.length > 0
          ? `Observar hoy: ${plan.observation_students.join(', ')}`
          : '',
      neeReminders: plan.nee_reminders,
    })),
    generatedAt: new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  }
}
