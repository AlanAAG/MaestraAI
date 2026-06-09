import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { renderMaterialPdf } from '@/lib/pdf/render-material'

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

    // Rate limiting - standard tier (50/hour for PDF export)
    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
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

    // Direct ownership check via teacher_id column on materials table
    if (material.teacher_id !== teacher.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const generatedAt = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const result = await renderMaterialPdf(material, generatedAt)

    if (!result) {
      return NextResponse.json(
        { error: 'Tipo de material no soportado para exportar' },
        { status: 400 }
      )
    }

    const uint8 = new Uint8Array(result.buffer)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}
