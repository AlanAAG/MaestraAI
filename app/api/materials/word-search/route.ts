import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildWordSearch } from '@/lib/materials/word-search'

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  lesson_plan_id: z.string().uuid().optional(),
  difficulty: z.enum(['kinder', 'standard']).default('kinder'),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { fortnight_id, lesson_plan_id, difficulty } = parsed.data

  // Verify fortnight ownership (IDOR guard)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fortnight } = await (supabase as any)
    .from('fortnights')
    .select('teacher_id')
    .eq('id', fortnight_id)
    .single()
  if (!fortnight || fortnight.teacher_id !== (teacher as { id: string }).id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Fetch vocabulary from fortnight's lesson plans
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await (supabase as any)
    .from('lesson_plans')
    .select('blocks')
    .eq('fortnight_id', fortnight_id)

  const vocabulary: string[] = (plans || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((p: any) => p.blocks?.flatMap((b: any) => b.vocabulary || []) || [])
    .filter((w: string, i: number, a: string[]) => a.indexOf(w) === i)

  if (vocabulary.length === 0) {
    return NextResponse.json({ error: 'No hay vocabulario en esta quincena' }, { status: 400 })
  }

  const content = buildWordSearch(vocabulary, difficulty)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: material, error: insertError } = await (supabase as any)
    .from('materials')
    .insert({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teacher_id: (teacher as any).id,
      fortnight_id,
      lesson_plan_id: lesson_plan_id || null,
      type: 'word_search',
      content,
      vocabulary,
      difficulty_level: difficulty,
      is_projectable: false,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to save word search:', insertError)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, material_id: material.id })
}
