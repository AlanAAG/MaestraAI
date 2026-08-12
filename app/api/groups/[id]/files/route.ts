import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  ALLOWED_FILE_TYPES,
  CLASS_FILES_BUCKET,
  MAX_FILE_BASE64,
  safeFileName,
} from '@/lib/files/class-files'

// Teacher uploads a file for a group post (attachment). Returns {name, path} to embed on the post.
export const maxDuration = 60

const Schema = z.object({
  name: z.string().trim().min(1).max(160),
  mimeType: z.string(),
  base64: z.string().min(1),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    const { success } = await checkRateLimit(user.id, 'standard', 'group-files')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: group } = await (supabase as any)
      .from('groups')
      .select('id, titular_teacher_id')
      .eq('id', params.id)
      .single()
    if (!teacher || !group || group.titular_teacher_id !== teacher.id) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
    }

    const name = safeFileName(body.data.name)
    const path = `g/${group.id}/${crypto.randomUUID()}-${name}`
    const service = createServiceClient()
    const { error } = await service.storage
      .from(CLASS_FILES_BUCKET)
      .upload(path, Buffer.from(body.data.base64, 'base64'), {
        contentType: body.data.mimeType,
        upsert: false,
      })
    if (error) throw error
    return NextResponse.json({ name, path })
  } catch (err) {
    console.error('[group-files]', err)
    return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 500 })
  }
}
