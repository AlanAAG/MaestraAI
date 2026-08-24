// Per-child data for the family portal: everything a parent may see about ONE child,
// fetched via service role AFTER the caller verified the parent_links row under RLS.
// Extracted from app/familia/(area)/page.tsx so the index and the per-child page share it.
import { decryptName } from '@/lib/students/name'
import { tareaEntregada, type PlayRow } from '@/lib/groups/classroom'

export interface Tarea {
  title: string
  due_at: string | null
  done: boolean
}

export interface Material {
  id: string
  title: string | null
  type: string
  play_token: string
}

export interface Juego {
  title: string
  correct: number
  total: number
  passed: boolean | null
  at: string
}

export interface Post {
  id: string
  kind: 'anuncio' | 'tarea'
  attachments: { name: string; path: string }[]
  title: string
  body: string | null
  due_date: string | null
  created_at: string
  material_type: string | null
  material_title: string | null
  play_token: string | null
  entregada: boolean | null // null = anuncio (no delivery state)
}

export interface ChildView {
  id: string
  groupId: string | null
  groupTeacherId: string | null
  name: string
  tareas: Tarea[]
  materiales: Material[]
  /** null = the teacher turned game results off, or no profile is linked yet. */
  juegos: Juego[] | null
  playerLinked: boolean
  posts: Post[]
}

export const TYPE_LABELS: Record<string, string> = {
  flashcards: 'Tarjetas',
  memory_game: 'Memorama',
  bingo: 'Bingo',
  word_search: 'Sopa de letras',
  matching: 'Relacionar',
  sorting_game: 'Clasificar',
  picture_word_match: '¿Cuál es la palabra?',
  youtube_videos: 'Videos',
}

export interface FortnightLite {
  vocabulary: string[] | null
  start_date: string
  end_date: string
  number: number
}

/** The fortnight covering `today`, else the latest by number. Pure — unit-tested. */
export function pickCurrentFortnight<T extends FortnightLite>(rows: T[], today: string): T | null {
  if (!rows.length) return null
  const current = rows.find((r) => r.start_date <= today && today <= r.end_date)
  if (current) return current
  return rows.reduce((a, b) => (b.number > a.number ? b : a))
}

/** Most recently created linked play profile. Pure — unit-tested. */
export function pickLinkedPlayer<T extends { created_at?: string | null }>(players: T[]): T | null {
  if (!players.length) return null
  return players.reduce((a, b) => ((b.created_at ?? '') > (a.created_at ?? '') ? b : a))
}

interface LinkLite {
  student_id: string
  teacher_id: string
}

// The service client is typed per-table; this helper predates typed selects (as in the page it
// was extracted from), so queries go through `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getChildView(service: any, link: LinkLite): Promise<ChildView | null> {
  const { data: student } = await service
    .from('students')
    .select('id, group_id, first_name_encrypted, last_name_encrypted, groups(titular_teacher_id)')
    .eq('id', link.student_id)
    .single()
  if (!student) return null

  const { first } = await decryptName(student).catch(() => ({ first: 'Tu hijo/a' }))

  // Homework: done/pending only — never numeric scores (NEM: qualitative always).
  const { data: scores } = await service
    .from('richmond_scores')
    .select('done, richmond_assignments(title, due_at)')
    .eq('student_id', link.student_id)
    .order('synced_at', { ascending: false })
    .limit(30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareas: Tarea[] = (scores ?? []).map((s: any) => ({
    title: s.richmond_assignments?.title ?? 'Tarea',
    due_at: s.richmond_assignments?.due_at ?? null,
    done: !!s.done,
  }))

  const { data: materials } = await service
    .from('materials')
    .select('id, title:content->>title, type, play_token')
    .eq('teacher_id', link.teacher_id)
    .eq('shared_with_parents', true)
    .not('play_token', 'is', null)
    .order('generated_at', { ascending: false })
    .limit(24)

  // Game results (migration 069). Visible only if the teacher allows it AND the child's play
  // profile was linked with its code. Best-effort: any error → the section simply doesn't show.
  let juegos: Juego[] | null = null
  let playerLinked = false
  try {
    const { data: teacher } = await service
      .from('teachers')
      .select('share_game_scores')
      .eq('id', link.teacher_id)
      .single()
    const { data: players } = await service
      .from('game_players')
      .select('id')
      .eq('student_id', link.student_id)
    playerLinked = !!players?.length
    if (teacher?.share_game_scores !== false && playerLinked) {
      const { data: plays } = await service
        .from('game_plays')
        .select('correct, total, passed, created_at, materials(type, content)')
        .in(
          'player_id',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (players ?? []).map((p: any) => p.id)
        )
        .order('created_at', { ascending: false })
        .limit(20)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      juegos = (plays ?? []).map((p: any) => ({
        title: p.materials?.content?.title ?? TYPE_LABELS[p.materials?.type] ?? 'Juego',
        correct: p.correct,
        total: p.total,
        passed: p.passed,
        at: p.created_at,
      }))
    }
  } catch {
    // migration 069 not applied yet → no games section
  }

  // Group wall: anuncios + tareas for the child's group. Tarea delivery state comes from the
  // child's linked play profiles (best-effort — everything degrades to just the feed).
  let posts: Post[] = []
  try {
    const { data: rawPosts } = await service
      .from('group_posts')
      .select(
        'id, kind, title, body, material_id, due_date, created_at, attachments, materials(type, play_token, content)'
      )
      .eq('group_id', student.group_id)
      .order('created_at', { ascending: false })
      .limit(20)
    let plays: PlayRow[] = []
    try {
      const { data: players } = await service
        .from('game_players')
        .select('id')
        .eq('student_id', link.student_id)
      if (players?.length) {
        const { data: playRows } = await service
          .from('game_plays')
          .select('material_id, passed')
          .in(
            'player_id',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            players.map((p: any) => p.id)
          )
        plays = (playRows ?? []) as PlayRow[]
      }
    } catch {
      /* migration 069 absent → no delivery state */
    }
    // Homework files this family already uploaded (a submission also counts as entregada).
    let submittedPosts = new Set<string>()
    try {
      const { data: mySubs } = await service
        .from('task_submissions')
        .select('post_id')
        .eq('student_id', link.student_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      submittedPosts = new Set((mySubs ?? []).map((x: any) => x.post_id))
    } catch {
      /* migration 078 absent */
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posts = (rawPosts ?? []).map((p: any) => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      body: p.body,
      due_date: p.due_date,
      created_at: p.created_at,
      material_type: p.materials?.type ?? null,
      material_title: p.materials?.content?.title ?? null,
      play_token: p.materials?.play_token ?? null,
      attachments: Array.isArray(p.attachments) ? p.attachments : [],
      entregada:
        p.kind === 'tarea'
          ? tareaEntregada(p.material_id, plays) || submittedPosts.has(p.id)
          : null,
    }))
  } catch {
    /* migration 074 absent → no wall */
  }

  return {
    id: link.student_id,
    groupId: student.group_id ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groupTeacherId: (student as any).groups?.titular_teacher_id ?? null,
    name: first || 'Tu hijo/a',
    tareas,
    materiales: (materials ?? []) as Material[],
    juegos,
    playerLinked,
    posts,
  }
}

export interface VocabCard {
  word: string
  letter: string | null
  colorHex: string | null
  imageUrl: string | null
}

/** The child's current vocabulary: the group's active fortnight words, enriched with the
 *  teacher's vocabulary_items (letter, color, drawing). Best-effort → []. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getChildVocab(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  groupId: string | null,
  teacherId: string | null,
  today: string
): Promise<VocabCard[]> {
  if (!groupId) return []
  try {
    const { data: fortnights } = await service
      .from('fortnights')
      .select('vocabulary, start_date, end_date, number')
      .eq('group_id', groupId)
      .order('number', { ascending: false })
      .limit(12)
    const current = pickCurrentFortnight((fortnights ?? []) as FortnightLite[], today)
    const words = (current?.vocabulary ?? []).filter(Boolean)
    if (!words.length) return []

    const byWord = new Map<
      string,
      { letter: string | null; colorHex: string | null; imageUrl: string | null }
    >()
    if (teacherId) {
      const { data: items } = await service
        .from('vocabulary_items')
        .select('word, letter, color_hex, image_url')
        .eq('teacher_id', teacherId)
        .in('word', words)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const it of items ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i = it as any
        byWord.set(String(i.word).trim().toLowerCase(), {
          letter: i.letter ?? null,
          colorHex: i.color_hex ?? null,
          imageUrl: i.image_url ?? null,
        })
      }
    }
    return words.map((w: string) => ({
      word: w,
      ...(byWord.get(w.trim().toLowerCase()) ?? { letter: null, colorHex: null, imageUrl: null }),
    }))
  } catch {
    return []
  }
}
