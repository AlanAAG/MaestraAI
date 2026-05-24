// lib/pdf.ts
// Pure data functions (testable). React PDF rendering happens in lib/DiaryPdfDocument.tsx.

export interface DiaryDocumentProps {
  teacherName: string
  weekLabel: string
  summaryText: string
  generatedAt: string
}

/** Builds PDF document props from raw input. Pure function — no side effects. */
export function buildDiaryDocumentProps(input: {
  teacherName: string
  weekStart: string
  weekEnd: string
  summaryText: string
}): DiaryDocumentProps {
  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    })

  const startFormatted = formatDate(input.weekStart)
  const endFormatted = formatDate(input.weekEnd)

  return {
    teacherName: input.teacherName,
    weekLabel: `Semana: ${startFormatted} al ${endFormatted}`,
    summaryText: input.summaryText,
    generatedAt: new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  }
}
