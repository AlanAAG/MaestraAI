'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

// Teacher-uploaded vocab images resolved at RENDER time (word → bucket URL), so every game and
// material — including ones generated before the images were uploaded — shows her drawings
// without regeneration. VocabVisual consults this context first.
const Ctx = createContext<Record<string, string>>({})

export function useTeacherImage(word: string): string | undefined {
  const map = useContext(Ctx)
  return map[word.trim().toLowerCase()]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMap(rows: any[] | null | undefined): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of rows ?? []) {
    if (r?.word && r?.image_url) map[String(r.word).trim().toLowerCase()] = r.image_url
  }
  return map
}

/**
 * Wrap any surface that renders VocabVisual. Pass `map` when the server already fetched it
 * (public /jugar); otherwise it self-fetches the logged-in teacher's images (RLS-scoped).
 * Best-effort: any error (e.g. migration 064 not applied) → empty map, visuals fall back.
 */
export function TeacherVocabImages({
  map,
  children,
}: {
  map?: Record<string, string>
  children: React.ReactNode
}) {
  const [value, setValue] = useState<Record<string, string>>(map ?? {})

  useEffect(() => {
    if (map) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('vocabulary_items')
      .select('*')
      .not('image_url', 'is', null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error }: { data: any[] | null; error: unknown }) => {
        if (!error) setValue(toMap(data))
      })
  }, [map])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
