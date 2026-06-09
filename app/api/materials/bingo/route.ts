import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateAllCards } from '@/lib/materials/bingo'
import { BingoPdfDocument } from '@/lib/BingoPdfDocument'

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  lesson_plan_id: z.string().uuid().optional(),
  card_count: z.number().int().min(1).max(35).default(30),
  free_space: z.boolean().default(true),
  vocabulary: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'relaxed')
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })
  }

  const {
    fortnight_id,
    card_count,
    free_space,
    lesson_plan_id,
    vocabulary: vocabOverride,
  } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fortnight } = await (supabase as any)
    .from('fortnights')
    .select('project_name')
    .eq('id', fortnight_id)
    .single()

  // Use stored vocabulary if provided (re-download), otherwise fetch from lesson plans
  let vocabulary: string[]
  if (vocabOverride && vocabOverride.length > 0) {
    vocabulary = vocabOverride
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plans } = await (supabase as any)
      .from('lesson_plans')
      .select('blocks')
      .eq('fortnight_id', fortnight_id)

    vocabulary = (plans || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((p: any) => p.blocks?.flatMap((b: any) => b.vocabulary || []) || [])
      .filter((w: string, i: number, a: string[]) => a.indexOf(w) === i)
  }

  if (vocabulary.length === 0) {
    return NextResponse.json({ error: 'No hay vocabulario en esta quincena' }, { status: 400 })
  }

  const result = generateAllCards(vocabulary, card_count, free_space)

  // Render PDF
  const pdfBuffer = await renderToBuffer(
    React.createElement(BingoPdfDocument, {
      cards: result.cards,
      vocabulary: result.vocabulary,
      title: fortnight?.project_name || 'Bingo',
    })
  )

  // Save record to materials table (store card count, not full card data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('materials').insert({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teacher_id: (teacher as any).id,
    fortnight_id,
    lesson_plan_id: lesson_plan_id || null,
    type: 'bingo',
    content: { card_count, free_space, vocabulary },
    vocabulary,
    is_projectable: false,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bingo-${card_count}-tarjetas.pdf"`,
    },
  })
}
