import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptNeeMap } from '@/lib/planner/nee-names'
import { checkRateLimit } from '@/lib/rate-limit'

// Returns label→real-name for the teacher's OWN fortnight, decrypted server-side. The viewer uses
// it to swap "Alumno A" → real names at render time. RLS scopes the fortnight to the teacher, so
// only the owner can resolve their students' names. Names never enter plan_document or the LLM.
export async function GET(req: NextRequest) {
  try {
    const fortnightId = req.nextUrl.searchParams.get('fortnight_id')
    if (!fortnightId) return NextResponse.json({ names: {} })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Decrypts student names — own bucket, throttled.
    const { success, headers } = await checkRateLimit(user.id, 'standard', 'nee-names')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select('plan_document')
      .eq('id', fortnightId)
      .single()

    const mapping = (fn?.plan_document as { _nee_mapping?: Record<string, string> } | null)
      ?._nee_mapping
    const names = await decryptNeeMap(mapping, supabase)
    return NextResponse.json({ names })
  } catch (err) {
    console.error('[nee-names]', err)
    return NextResponse.json({ names: {} })
  }
}
