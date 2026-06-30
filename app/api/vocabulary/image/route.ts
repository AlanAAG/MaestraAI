// POST /api/vocabulary/image — upload a teacher's photo for one vocabulary word.
// Multipart: { file, word_id }. Ownership-checked, then uploaded to the public `vocab-images`
// bucket via the service role (so no per-object storage RLS is needed) and the public URL is
// saved on vocabulary_items.image_url. Games pick it up via the generation imageMap.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const form = await req.formData()
    const file = form.get('file')
    const wordId = String(form.get('word_id') ?? '')
    if (!(file instanceof File) || !wordId)
      return NextResponse.json({ error: 'Falta la imagen o la palabra' }, { status: 422 })
    const ext = EXT[file.type]
    if (!ext)
      return NextResponse.json({ error: 'Formato no válido (PNG/JPG/WebP)' }, { status: 422 })
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: 'La imagen supera 3 MB' }, { status: 422 })

    // Ownership: the word must belong to this teacher.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: word } = await (supabase as any)
      .from('vocabulary_items')
      .select('id, teacher_id')
      .eq('id', wordId)
      .single()
    if (!word || word.teacher_id !== teacher.id)
      return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const path = `${teacher.id}/${wordId}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await service.storage
      .from('vocab-images')
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (upErr) {
      console.error('[vocab-image] upload', upErr)
      return NextResponse.json({ error: 'No se pudo subir la imagen.' }, { status: 500 })
    }
    // Cache-bust so a re-upload to the same path shows immediately.
    const {
      data: { publicUrl },
    } = service.storage.from('vocab-images').getPublicUrl(path)
    const imageUrl = `${publicUrl}?v=${Date.now()}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('vocabulary_items')
      .update({ image_url: imageUrl })
      .eq('id', wordId)

    return NextResponse.json({ image_url: imageUrl })
  } catch (err) {
    console.error('[vocab-image]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
