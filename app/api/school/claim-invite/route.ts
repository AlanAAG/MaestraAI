import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit } from '@/lib/rate-limit'
import { escapeLike } from '@/lib/html'

// Idempotent: if the signed-in teacher's email is on a school allowlist and she has no school
// yet, link her (school_id + role from the invite). Called after onboarding and from /red.
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { success } = await checkRateLimit(user.id, 'standard', 'claim-invite')
    if (!success) return NextResponse.json({ claimed: false }, { status: 429 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id, school_id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ claimed: false })
    if (teacher.school_id) return NextResponse.json({ claimed: false, already: true })

    const service = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invite } = await (service as any)
      .from('school_invites')
      .select('id, school_id, role')
      // escapeLike: %/_ in an email local part must match literally, not as wildcards.
      .ilike('email', escapeLike(user.email))
      .is('claimed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!invite) return NextResponse.json({ claimed: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any)
      .from('teachers')
      .update({ school_id: invite.school_id, role_type: invite.role })
      .eq('id', teacher.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any)
      .from('school_invites')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', invite.id)
    return NextResponse.json({ claimed: true })
  } catch (err) {
    console.error('[claim-invite]', err)
    return NextResponse.json({ claimed: false })
  }
}
