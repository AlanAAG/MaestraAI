import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { encrypt } from '@/lib/encryption'

const SaveSchema = z.object({
  q1: z.string().max(2000).optional(),
  q2: z.string().max(2000).optional(),
  q3: z.string().max(2000).optional(),
  q4: z.string().max(2000).optional(),
  q5: z.string().max(2000).optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summaryText: z.string().max(10000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429 }
      )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

    const body = SaveSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

    const { q1, q2, q3, q4, q5, weekStart, weekEnd, summaryText } = body.data

    // Encrypt the raw wizard answers at rest — q5 in particular names individual students.
    // These columns are write-only (no UI reads them back), so no decrypt path is needed.
    // ai_summary stays plaintext: it is the student-name-redacted, publicly-shareable summary
    // and is read by browser clients that have no decryption key.
    const enc = async (v?: string) => (v ? await encrypt(v) : v)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('teacher_diary')
      .upsert(
        {
          teacher_id: teacher.id,
          week_start: weekStart,
          week_end: weekEnd,
          q1_functioning: await enc(q1),
          q2_challenging: await enc(q2),
          q3_group: await enc(q3),
          q4_adjust: await enc(q4),
          q5_student_obs: await enc(q5),
          ai_summary: summaryText,
          source: 'diary_microsite',
        },
        { onConflict: 'teacher_id,week_start' }
      )
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err) {
    console.error('diary/save error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
