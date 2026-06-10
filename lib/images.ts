// lib/images.ts — server-only image fetching utility
// Do NOT import from 'use client' components.

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
