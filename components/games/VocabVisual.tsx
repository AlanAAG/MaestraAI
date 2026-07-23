'use client'
import { useState } from 'react'
import { isEmoji, wordToEmoji } from '@/lib/materials/emoji'
import { useTeacherImage } from './TeacherImages'

// The single visual seam for every game. Resolution order:
//   TEACHER-UPLOADED image (vocab-images bucket) → VALID stored emoji (AI sense-correct,
//   validated) → curated word→emoji map → other image (Unsplash) → text.
// The stored emoji is validated so a stray letter/text the model returned can't render as the
// "visual"; a dead image URL falls through to emoji/text instead of a broken-image icon.
export function VocabVisual({
  word,
  emoji,
  imageUrl,
  className = '',
  emojiClassName = 'text-[clamp(2.5rem,12vmin,7rem)] leading-none',
}: {
  word: string
  emoji?: string | null
  imageUrl?: string | null
  className?: string
  emojiClassName?: string
}) {
  // Track the failed URL (not a boolean) — games reuse one instance across items, so a single
  // dead URL must not disable images for every later word.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  // Live teacher image (TeacherVocabImages context) beats everything — it covers materials
  // generated BEFORE the teacher uploaded her drawings, with no regeneration needed.
  const liveTeacherUrl = useTeacherImage(word)
  const src = liveTeacherUrl ?? imageUrl ?? null
  const imgOk = !!src && src !== failedUrl
  // Teacher's own photo (Supabase vocab-images bucket) always wins over emojis.
  // ponytail: stored-content provenance sniffed from the URL; if a non-bucket image source is
  // ever added (gen-AI provider), stamp image_source at generation instead of extending this.
  const isTeacherImage = !!liveTeacherUrl || (!!src && src.includes('/vocab-images/'))
  const glyph = (isEmoji(emoji) ? emoji : null) || wordToEmoji(word)
  if (src && imgOk && (isTeacherImage || !glyph)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={word}
        onError={() => setFailedUrl(src)}
        className={`object-contain ${className}`}
        draggable={false}
      />
    )
  }
  if (glyph) {
    return (
      <span
        role="img"
        aria-label={word}
        className={`flex items-center justify-center select-none ${emojiClassName} ${className}`}
      >
        {glyph}
      </span>
    )
  }
  return (
    <span className={`flex items-center justify-center font-bold text-center ${className}`}>
      {word}
    </span>
  )
}
