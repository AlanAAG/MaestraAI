import { notFound } from 'next/navigation'
import { PlayerGate } from '@/components/games/PlayerGate'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { grantsAccess } from '@/lib/parents/links'
import { pickLinkedPlayer } from '@/lib/parents/child-data'
import { getBrandByTeacherId } from '@/lib/school/brand'
import { SchoolBrandHeader } from '@/components/school/SchoolBrandHeader'
import { appFontStyle } from '@/lib/design/fonts'
import { appThemeVars } from '@/lib/design/themes'
import { TeacherVocabImages } from '@/components/games/TeacherImages'

interface Props {
  params: { token: string }
}

export default async function JugarPage({ params }: Props) {
  const supabase = createServiceClient()

  // One round-trip: the material + its owner's design (teachers embedded via the FK) —
  // shared games follow the teacher's app font (best-effort).
  const { data: material } = await supabase
    .from('materials')
    .select('type, content, vocabulary, teacher_id, teachers(design_settings)')
    .eq('play_token', params.token)
    .single()

  if (!material) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const design = (material as any).teachers?.design_settings
  // Shared games follow the teacher's environment: font + color theme (best-effort).
  const wrapperStyle = {
    ...appFontStyle(design?.app_font),
    ...(appThemeVars(design?.app_color) ?? {}),
  } as React.CSSProperties

  // Homework threshold (migration 069). Fetched apart so an unapplied migration can never 404 a game.
  let minCorrect: number | null = null
  try {
    const { data } = await supabase
      .from('materials')
      .select('homework_min_correct')
      .eq('play_token', params.token)
      .single()
    minCorrect = (data?.homework_min_correct as number | null) ?? null
  } catch {
    // migration 069 not applied → free play
  }

  // The owning teacher's uploaded vocab drawings — shared games show them live (best-effort).
  const imageMap: Record<string, string> = {}
  try {
    const { data: vocabRows } = await supabase
      .from('vocabulary_items')
      .select('word, image_url')
      .eq('teacher_id', material.teacher_id as string)
      .not('image_url', 'is', null)
    for (const r of vocabRows ?? []) {
      if (r.word && r.image_url) imageMap[String(r.word).trim().toLowerCase()] = r.image_url
    }
  } catch {
    // migration 064 not applied / any error → games fall back to stored visuals
  }

  // Signed-in parent → skip the nickname gate with their child's linked profile. The
  // teacher_id filter is required: results must land on THIS teacher's player profile.
  let initialPlayer: { id: string; nickname: string; avatar: string; code: string } | null = null
  try {
    const cookieClient = await createClient()
    const {
      data: { user },
    } = await cookieClient.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rawLinks } = await (cookieClient as any)
        .from('parent_links')
        .select('student_id, expires_at, claimed_at, revoked_at')
        .eq('parent_auth_id', user.id)
      type LinkRow = { student_id: string } & Parameters<typeof grantsAccess>[0]
      const studentIds = ((rawLinks ?? []) as LinkRow[])
        .filter((l) => grantsAccess(l))
        .map((l) => l.student_id)
      if (studentIds.length) {
        const { data: players } = await supabase
          .from('game_players')
          .select('id, nickname, avatar, code, created_at')
          .in('student_id', studentIds)
          .eq('teacher_id', material.teacher_id as string)
        const p = pickLinkedPlayer(players ?? [])
        if (p) initialPlayer = { id: p.id, nickname: p.nickname, avatar: p.avatar, code: p.code }
      }
    }
  } catch {
    /* anonymous flow stays the default */
  }

  // White-label: the owning teacher's school brand, MaestraIA otherwise (best-effort).
  const brand = await getBrandByTeacherId(supabase, material.teacher_id as string)

  return (
    <div className="min-h-screen bg-gray-50" style={wrapperStyle}>
      <SchoolBrandHeader brand={brand} />
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
        <TeacherVocabImages map={imageMap}>
          <PlayerGate
            token={params.token}
            type={material.type as string}
            content={material.content as Record<string, unknown>}
            vocabulary={(material.vocabulary as string[]) ?? []}
            minCorrect={minCorrect}
            initialPlayer={initialPlayer}
          />
        </TeacherVocabImages>
      </main>
    </div>
  )
}
