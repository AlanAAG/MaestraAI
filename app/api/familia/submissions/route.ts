import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { grantsAccess } from '@/lib/parents/links'
import {
  ALLOWED_FILE_TYPES,
  CLASS_FILES_BUCKET,
  MAX_FILE_BASE64,
  safeFileName,
} from '@/lib/files/class-files'

// A family uploads their child's homework for a tarea post. File → class-files bucket,
// row → task_submissions (teacher sees it on the group wall).
export const maxDuration = 60

const Schema = z.object({
  post_id: z.string().uuid(),
  student_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  mimeType: z.string(),
  base64: z.string().min(1),
  note: z.string().trim().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    if (!ALLOWED_FILE_TYPES.has(body.data.mimeType)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
    }
    if (body.data.base64.length > MAX_FILE_BASE64) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 6MB).' }, { status: 413 })
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'standard', 'submissions')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    const service = createServiceClient()
    // The parent must hold a live link to this student…
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (service as any)
      .from('parent_links')
      .select('expires_at, claimed_at, revoked_at, students(group_id)')
      .eq('parent_auth_id', user.id)
      .eq('student_id', body.data.student_id)
      .maybeSingle()
    if (!link || !grantsAccess(link)) {
      return NextResponse.json({ error: 'Sin acceso a ese alumno' }, { status: 403 })
    }
    // …and the post must be a tarea of the child's group.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post } = await (service as any)
      .from('group_posts')
      .select('id, kind, group_id')
      .eq('id', body.data.post_id)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!post || post.kind !== 'tarea' || post.group_id !== (link as any).students?.group_id) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    const name = safeFileName(body.data.name)
    const path = `s/${post.id}/${body.data.student_id}/${crypto.randomUUID()}-${name}`
    const { error: upErr } = await service.storage
      .from(CLASS_FILES_BUCKET)
      .upload(path, Buffer.from(body.data.base64, 'base64'), {
        contentType: body.data.mimeType,
        upsert: false,
      })
    if (upErr) throw upErr

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (service as any).from('task_submissions').insert({
      post_id: post.id,
      student_id: body.data.student_id,
      uploaded_by: user.id,
      file_path: path,
      file_name: name,
      note: body.data.note || null,
    })
    if (error) throw error
    return NextResponse.json({ ok: true, path })
  } catch (err) {
    console.error('[submissions]', err)
    return NextResponse.json({ error: 'No se pudo subir la tarea.' }, { status: 500 })
  }
}
