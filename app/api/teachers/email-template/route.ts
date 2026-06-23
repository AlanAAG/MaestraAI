import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_TEMPLATE } from '@/lib/calificaciones/notify'

// Account-level parent-notification email template (teachers.parent_email_template).
// GET returns the saved template or the built-in default. PUT saves an override.

const Schema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
})

async function getTeacher() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, teacher: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id, parent_email_template')
    .eq('auth_id', user.id)
    .single()
  return { supabase, teacher }
}

export async function GET() {
  try {
    const { teacher } = await getTeacher()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({
      template: teacher.parent_email_template ?? null,
      default: DEFAULT_TEMPLATE,
    })
  } catch (err) {
    console.error('email-template GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 422 })

    const { supabase, teacher } = await getTeacher()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('teachers')
      .update({ parent_email_template: body.data })
      .eq('id', teacher.id)
    if (error) throw error

    return NextResponse.json({ ok: true, template: body.data })
  } catch (err) {
    console.error('email-template PUT error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
