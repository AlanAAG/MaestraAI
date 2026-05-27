import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { FlashcardPdfDocument } from '@/lib/FlashcardPdfDocument'
import { WorksheetPdfDocument } from '@/lib/WorksheetPdfDocument'
import { GameCardsPdfDocument } from '@/lib/GameCardsPdfDocument'
import { createClient } from '@/lib/supabase/server'

const ExportInputSchema = z.object({
  material_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  // Parse and validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = ExportInputSchema.safeParse(body)
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

    // Get material
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: material, error: materialError } = await (supabase as any)
      .from('materials')
      .select('*')
      .eq('id', parsed.data.material_id)
      .single()

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })
    }

    // Verify ownership (material belongs to teacher's lesson plan)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Check if material belongs to teacher via lesson_plans -> fortnights
    if (material.lesson_plan_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lessonPlan } = await (supabase as any)
        .from('lesson_plans')
        .select('fortnight_id')
        .eq('id', material.lesson_plan_id)
        .single()

      if (lessonPlan) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: fortnight } = await (supabase as any)
          .from('fortnights')
          .select('teacher_id')
          .eq('id', lessonPlan.fortnight_id)
          .single()

        if (!fortnight || fortnight.teacher_id !== teacher.id) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }
      }
    }

    const generatedAt = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    let pdfBuffer: Buffer
    let filename: string

    // Generate appropriate PDF based on material type
    switch (material.type) {
      case 'flashcards': {
        const cards = material.content.cards || []
        const props = {
          cards,
          letter: material.letter || undefined,
          generatedAt,
        }
        pdfBuffer = await renderToBuffer(
          React.createElement(FlashcardPdfDocument, props) as React.ReactElement<DocumentProps>
        )
        filename = `Flashcards_${material.letter || 'Vocabulario'}.pdf`
        break
      }

      case 'worksheets': {
        const activities = material.content.activities || []
        const vocabulary = material.vocabulary || []
        const props = {
          activities,
          letter: material.letter || undefined,
          vocabulary,
          generatedAt,
        }
        pdfBuffer = await renderToBuffer(
          React.createElement(WorksheetPdfDocument, props) as React.ReactElement<DocumentProps>
        )
        filename = `Worksheet_${material.letter || 'Actividades'}.pdf`
        break
      }

      case 'game': {
        const pairs = material.content.pairs || []
        const gameType = material.content.game_type || 'memory_match'
        const props = {
          pairs,
          gameType,
          generatedAt,
        }
        pdfBuffer = await renderToBuffer(
          React.createElement(GameCardsPdfDocument, props) as React.ReactElement<DocumentProps>
        )
        filename = `Game_Cards_${gameType}.pdf`
        break
      }

      default:
        return NextResponse.json(
          { error: 'Tipo de material no soportado para exportar' },
          { status: 400 }
        )
    }

    // Convert to Uint8Array
    const uint8 = new Uint8Array(pdfBuffer)

    // Return PDF with proper headers
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}
