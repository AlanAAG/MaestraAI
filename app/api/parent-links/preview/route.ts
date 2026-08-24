// "Ver como familia": the teacher self-claims a family link for one of their own students to
// preview /familia exactly as a parent sees it. No new data exposure — the teacher already
// owns everything the family view shows. The link is a normal parent_links row (revocable,
// listed in the invite card like any other).
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit } from '@/lib/rate-limit'
import { encrypt } from '@/lib/encryption'
import { mintInviteToken } from '@/lib/parents/links'

const PostSchema = z.object({ student_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = PostSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id, email')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    // Ownership: the student must be in one of this teacher's groups.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: student } = await (supabase as any)
      .from('students')
      .select('id, groups(titular_teacher_id)')
      .eq('id', body.data.student_id)
      .single()
    if (!student || student.groups?.titular_teacher_id !== teacher.id)
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const service = createServiceClient()

    // Reuse an existing active self-link (unique index forbids a second one anyway).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (service as any)
      .from('parent_links')
      .select('id')
      .eq('student_id', body.data.student_id)
      .eq('parent_auth_id', user.id)
      .is('revoked_at', null)
      .not('claimed_at', 'is', null)
      .limit(1)
    if (existing?.length) return NextResponse.json({ ok: true })

    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (service as any).from('parent_links').insert({
      teacher_id: teacher.id,
      student_id: body.data.student_id,
      parent_auth_id: user.id,
      invite_token: mintInviteToken(),
      invite_email_encrypted: await encrypt(teacher.email ?? 'preview@maestraia.com'),
      expires_at: now, // already claimed → expiry is irrelevant (linkStatus: claimed = activo)
      claimed_at: now,
    })
    if (error)
      return NextResponse.json({ error: 'No pude crear la vista previa.' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[parent-links preview]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
