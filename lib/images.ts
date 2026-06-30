// lib/images.ts — server-only image fetching utility
// Do NOT import from 'use client' components.

// Teacher-uploaded per-word images (vocabulary_items.image_url) — these OVERRIDE the stock
// Unsplash fallback, so a photo the teacher chose always wins. Keyed lowercase like fetchVocabImages.
export async function fetchTeacherVocabImages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  words: string[]
): Promise<Record<string, string>> {
  if (!words.length) return {}
  try {
    const { data } = await supabase
      .from('vocabulary_items')
      .select('word, image_url')
      .in('word', words)
      .not('image_url', 'is', null)
    const out: Record<string, string> = {}
    for (const r of data ?? []) if (r.image_url) out[String(r.word).toLowerCase()] = r.image_url
    return out
  } catch {
    return {}
  }
}

export async function fetchVocabImages(words: string[]): Promise<Record<string, string>> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key || words.length === 0) return {}

  const results: Record<string, string> = {}

  await Promise.allSettled(
    words.map(async (word) => {
      try {
        const query = encodeURIComponent(`${word} cartoon illustration white background`)
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${query}&per_page=1&content_filter=high&orientation=squarish`,
          { headers: { Authorization: `Client-ID ${key}` } }
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          results?: Array<{ urls?: { small?: string } }>
        }
        const url = data.results?.[0]?.urls?.small
        if (url) results[word.toLowerCase()] = url
      } catch {
        // Silently skip — content still generates without images
      }
    })
  )

  return results
}
