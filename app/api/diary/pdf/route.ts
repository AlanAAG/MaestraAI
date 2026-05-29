import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { DiaryPdfDocument } from '@/lib/DiaryPdfDocument'
import { buildDiaryDocumentProps } from '@/lib/pdf'
import { checkRateLimit } from '@/lib/rate-limit'

const PdfInputSchema = z.object({
  teacherName: z.string().max(100).optional().default('Maestra'),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summaryText: z.string().max(5000),
})

export async function POST(req: NextRequest) {
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

  // Rate limiting - standard tier (50/hour for PDF generation)
  // Use IP address as identifier since this is a public endpoint
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const { success, headers } = await checkRateLimit(ip, 'standard')
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429, headers }
    )
  }

  const props = buildDiaryDocumentProps(parsed.data)
  const pdfBuffer = await renderToBuffer(
    React.createElement(DiaryPdfDocument, props) as React.ReactElement<DocumentProps>
  )
  const filename = `diario-${parsed.data.weekStart.replace(/-/g, '')}.pdf`
  const uint8 = new Uint8Array(pdfBuffer)

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
