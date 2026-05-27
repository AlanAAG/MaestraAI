import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ReportInputSchema = z.object({
  trimester: z.number().int().min(1).max(3),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const input = ReportInputSchema.parse(body)
    const studentId = params.id

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load student with group info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: student } = await (supabase as any)
      .from('students')
      .select('*, groups(name, grade, titular_teacher_id, school_id)')
      .eq('id', studentId)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Verify teacher access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id, full_name')
      .eq('auth_id', user.id)
      .single()

    if (!teacher || student.groups?.titular_teacher_id !== teacher.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load school
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: school } = await (supabase as any)
      .from('schools')
      .select('name, city')
      .eq('id', student.groups.school_id)
      .single()

    // Load observations (qualitative only)
    const trimesterDates = getTrimesterDateRange(input.trimester)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: observations } = await (supabase as any)
      .from('teacher_observations')
      .select('observed_date')
      .eq('student_id', studentId)
      .gte('observed_date', trimesterDates.start)
      .lte('observed_date', trimesterDates.end)

    // Load fortnights
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fortnights } = await (supabase as any)
      .from('fortnights')
      .select('project_name')
      .eq('group_id', student.group_id)
      .gte('start_date', trimesterDates.start)
      .lte('end_date', trimesterDates.end)

    // Generate summary
    const summary = generateQualitativeSummary(observations, fortnights, student)

    // Generate text PDF
    const pdfContent = generateSimplePDF({
      studentName: student.display_name,
      groupName: student.groups?.name,
      gradeName: student.groups?.grade,
      hasNEE: student.has_nee,
      schoolName: school?.name || 'N/A',
      teacherName: teacher.full_name,
      summary,
      hasObservations: observations && observations.length > 0,
    })

    return new NextResponse(pdfContent.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-${student.display_name.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Error generating report:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getTrimesterDateRange(trimester: number): { start: string; end: string } {
  const year = new Date().getFullYear()
  const ranges = {
    1: { start: `${year}-08-01`, end: `${year}-11-30` },
    2: { start: `${year}-12-01`, end: `${year + 1}-03-31` },
    3: { start: `${year + 1}-04-01`, end: `${year + 1}-07-31` },
  }
  return ranges[trimester as keyof typeof ranges]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateQualitativeSummary(observations: any[], fortnights: any[], student: any): string {
  if (!observations || observations.length === 0) {
    return 'No se registraron observaciones cualitativas en este periodo.'
  }

  let summary =
    'El alumno participó en las actividades del periodo. Se documentó su desarrollo mediante observaciones cualitativas. '

  if (student.has_nee) {
    summary += 'Se brindó apoyo especializado según sus necesidades educativas especiales. '
  }

  if (fortnights && fortnights.length > 0) {
    summary += 'Participó en los proyectos quincenales del grupo.'
  }

  return summary
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateSimplePDF(content: any): Buffer {
  const text = `
REPORTE TRIMESTRAL DE ALUMNO

Escuela: ${content.schoolName}
Alumno: ${content.studentName}
Grupo: ${content.groupName}
Grado: ${content.gradeName}
Docente: ${content.teacherName}
${content.hasNEE ? 'NEE: Sí' : ''}

RESUMEN CUALITATIVO
${content.summary}

${content.hasObservations ? 'Se registraron observaciones cualitativas.' : 'Sin observaciones registradas.'}

Reporte generado conforme al Nuevo Marco Curricular (NEM).
`

  return Buffer.from(text, 'utf-8')
}
