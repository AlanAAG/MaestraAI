import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CLASS_FILES_BUCKET } from '@/lib/files/class-files'

// Daily sweep: RAG chunks and pa/ files whose attachment never made it onto a plan
// (abandoned creations) are deleted after a 48h grace window. Referenced = any key/path
// present in some fortnight's attachment_context. Work is capped per run — leftovers
// simply wait for tomorrow.
export const maxDuration = 120
const GRACE_MS = 48 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const cutoff = new Date(Date.now() - GRACE_MS).toISOString()

  // Referenced keys/paths across every plan.
  const referenced = new Set<string>()
  const { data: fns } = await supabase
    .from('fortnights')
    .select('attachment_context')
    .not('attachment_context', 'is', null)
  for (const fn of fns ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of (fn.attachment_context as any[]) ?? []) {
      if (a?.key) referenced.add(String(a.key))
      if (a?.path) referenced.add(String(a.path))
    }
  }

  // 1) Orphan chunks.
  let chunksDeleted = 0
  const { data: oldChunks } = await supabase
    .from('plan_attachment_chunks')
    .select('id, attachment_key')
    .lt('created_at', cutoff)
    .limit(2000)
  const orphanIds = (oldChunks ?? [])
    .filter((c) => !referenced.has(c.attachment_key))
    .map((c) => c.id)
  if (orphanIds.length) {
    const { error } = await supabase.from('plan_attachment_chunks').delete().in('id', orphanIds)
    if (!error) chunksDeleted = orphanIds.length
  }

  // 2) Orphan files under pa/<teacherId>/.
  let filesDeleted = 0
  const { data: teacherDirs } = await supabase.storage
    .from(CLASS_FILES_BUCKET)
    .list('pa', { limit: 100 })
  for (const dir of teacherDirs ?? []) {
    if (!dir.name) continue
    const { data: files } = await supabase.storage
      .from(CLASS_FILES_BUCKET)
      .list(`pa/${dir.name}`, { limit: 100 })
    const toRemove = (files ?? [])
      .filter((f) => f.created_at && f.created_at < cutoff)
      .map((f) => `pa/${dir.name}/${f.name}`)
      .filter((p) => !referenced.has(p) && !referenced.has(p.replace(/-anexo\.pdf$/, '')))
      .slice(0, 100)
    if (toRemove.length) {
      const { error } = await supabase.storage.from(CLASS_FILES_BUCKET).remove(toRemove)
      if (!error) filesDeleted += toRemove.length
    }
  }

  console.log(`[attachment-cleanup] chunks=${chunksDeleted} files=${filesDeleted}`)
  return NextResponse.json({ ok: true, chunksDeleted, filesDeleted })
}
