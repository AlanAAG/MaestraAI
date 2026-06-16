import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entry } = await (supabase as any)
    .from('teacher_diary')
    .select('id, share_token')
    .eq('id', id)
    .eq('teacher_id', teacher.id)
    .single()
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Reuse existing token or mint a new one
  const token = (entry.share_token as string | null) ?? crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('teacher_diary')
    .update({ share_token: token, share_expires_at: expiresAt, visibility: 'shared_link' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 })
  return NextResponse.json({ token })
}
