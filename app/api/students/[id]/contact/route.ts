import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentId = params.id

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Strict rate limit — prevents bulk scraping of parent contacts
    const { success, headers } = await checkRateLimit(user.id, 'strict', 'student-contact')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ownership check: student must belong to teacher's group
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: student } = await (supabase as any)
      .from('students')
      .select('display_name, parent_contact_encrypted, groups(titular_teacher_id)')
      .eq('id', studentId)
      .single()

    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (student.groups?.titular_teacher_id !== teacher.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!student.parent_contact_encrypted) {
      return NextResponse.json({ error: 'No contact stored' }, { status: 404 })
    }

    const phone = await decrypt(student.parent_contact_encrypted)
    // Use the number as-is if it already carries a country code (>10 digits);
    // otherwise assume the local default (Mexico = 52). ponytail: per-school country
    // code if we ever onboard outside MX — for now a length heuristic covers it.
    const raw = phone.replace(/\D/g, '')
    const digits = raw.length > 10 ? raw : `52${raw}`
    const message = encodeURIComponent(`Hola, soy la maestra de ${student.display_name}. `)

    await logAudit({
      teacher_id: teacher.id,
      action: AUDIT_ACTIONS.STUDENT_CONTACT_VIEW,
      resource_type: 'student',
      resource_id: studentId,
      req,
    })

    return NextResponse.json({ phone, wa_url: `https://wa.me/${digits}?text=${message}` })
  } catch (err) {
    console.error('Error fetching student contact:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
