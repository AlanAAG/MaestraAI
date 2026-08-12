import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { decryptName } from '@/lib/students/name'

// Teacher view: every family submission for a tarea post, with the child's first name
// (decrypted server-side) — names never reach the client any other way.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postId = req.nextUrl.searchParams.get('post_id')
    if (!postId || !z.string().uuid().safeParse(postId).success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post } = await (supabase as any)
      .from('group_posts')
      .select('id, teacher_id, group_id')
      .eq('id', postId)
      .single()
    if (!teacher || !post || post.teacher_id !== teacher.id || post.group_id !== params.id) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const service = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs } = await (service as any)
      .from('task_submissions')
      .select(
        'id, file_path, file_name, note, created_at, students(first_name_encrypted, last_name_encrypted)'
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    const out = []
    for (const s of subs ?? []) {
      const { first } = await decryptName(s.students ?? {}).catch(() => ({ first: 'Alumno' }))
      out.push({
        id: s.id,
        file_path: s.file_path,
        file_name: s.file_name,
        note: s.note,
        created_at: s.created_at,
        student_name: first || 'Alumno',
      })
    }
    return NextResponse.json({ submissions: out })
  } catch (err) {
    console.error('[group-submissions]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
