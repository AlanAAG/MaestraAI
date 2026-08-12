import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { grantsAccess } from '@/lib/parents/links'
import { CLASS_FILES_BUCKET, parseFilePath } from '@/lib/files/class-files'

// Signed URL for a class file, after checking the requester belongs to its scope:
// post attachments → group teacher or any linked family of the group;
// submissions → the post's teacher or the uploading child's family.
export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get('path') ?? ''
    const scope = parseFilePath(path)
    if (!scope) return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const service = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (service as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()

    let allowed = false
    if (scope.kind === 'post') {
      if (teacher) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: g } = await (service as any)
          .from('groups')
          .select('titular_teacher_id')
          .eq('id', scope.groupId)
          .maybeSingle()
        allowed = g?.titular_teacher_id === teacher.id
      }
      if (!allowed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: links } = await (service as any)
          .from('parent_links')
          .select('expires_at, claimed_at, revoked_at, students(group_id)')
          .eq('parent_auth_id', user.id)
        allowed = (links ?? []).some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (l: any) => grantsAccess(l) && l.students?.group_id === scope.groupId
        )
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: post } = await (service as any)
        .from('group_posts')
        .select('teacher_id')
        .eq('id', scope.postId)
        .maybeSingle()
      allowed = !!teacher && post?.teacher_id === teacher.id
      if (!allowed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: link } = await (service as any)
          .from('parent_links')
          .select('expires_at, claimed_at, revoked_at')
          .eq('parent_auth_id', user.id)
          .eq('student_id', scope.studentId)
          .maybeSingle()
        allowed = !!link && grantsAccess(link)
      }
    }
    if (!allowed) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

    const { data, error } = await service.storage
      .from(CLASS_FILES_BUCKET)
      .createSignedUrl(path, 3600)
    if (error || !data?.signedUrl) throw error ?? new Error('sign failed')
    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error('[files-sign]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
