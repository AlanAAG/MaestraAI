import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CLASS_FILES_BUCKET, safeFileName } from '@/lib/files/class-files'

// Signed upload URL so big reference files go straight from the browser to Storage —
// Vercel caps API bodies at ~4.5MB, so proxying uploads through the API silently broke
// anything over ~3MB. The file lives only until extraction (the extract route deletes it).
export async function POST(req: Request) {
  try {
    const { name } = await req.json().catch(() => ({}) as { name?: string })
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
    if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const path = `pa/${teacher.id}/${crypto.randomUUID()}-${safeFileName(String(name ?? 'archivo'))}`
    const service = createServiceClient()
    const { data, error } = await service.storage
      .from(CLASS_FILES_BUCKET)
      .createSignedUploadUrl(path)
    if (error || !data) throw error ?? new Error('sign failed')
    return NextResponse.json({ path, token: data.token })
  } catch (err) {
    console.error('[attachments-upload-url]', err)
    return NextResponse.json({ error: 'No se pudo preparar la subida.' }, { status: 500 })
  }
}
