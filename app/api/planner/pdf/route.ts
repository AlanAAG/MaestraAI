import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { PlaneacionPdfDocument } from '@/lib/PlaneacionPdfDocument'
import { buildPlaneacionPdfProps } from '@/lib/pdf-planeacion'
import { createClient } from '@/lib/supabase/server'

const PdfInputSchema = z.object({
  fortnight_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  // Parse and validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = PdfInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get teacher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher, error: teacherError } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Get fortnight with group and school relations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fortnight, error: fortnightError } = await (supabase as any)
      .from('fortnights')
      .select(
        `
        *,
        groups (
          name,
          grade,
          schools (
            name
          )
        )
      `
      )
      .eq('id', parsed.data.fortnight_id)
      .eq('teacher_id', teacher.id)
      .single()

    if (fortnightError || !fortnight) {
      return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 })
    }

    // Get lesson plans
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lessonPlans, error: plansError } = await (supabase as any)
      .from('lesson_plans')
      .select('*')
      .eq('fortnight_id', parsed.data.fortnight_id)
      .order('day_number', { ascending: true })

    if (plansError || !lessonPlans || lessonPlans.length === 0) {
      return NextResponse.json(
        { error: 'No hay planeaciones generadas para esta quincena' },
        { status: 404 }
      )
    }

    // Build PDF props
    const props = buildPlaneacionPdfProps({
      fortnight,
      lessonPlans,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      group: (fortnight as any).groups,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      school: (fortnight as any).groups.schools,
    })

    // Render PDF to buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(PlaneacionPdfDocument, props) as React.ReactElement<DocumentProps>
    )

    // Convert to Uint8Array
    const uint8 = new Uint8Array(pdfBuffer)

    // Return PDF with proper headers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filename = `Planeacion_Quincena_${(fortnight as any).number.toString().padStart(2, '0')}.pdf`
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}
