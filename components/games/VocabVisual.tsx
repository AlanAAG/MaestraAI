'use client'
import { useState } from 'react'
import { isEmoji, wordToEmoji } from '@/lib/materials/emoji'

// The single visual seam for every game. Resolution order:
//   VALID stored emoji (AI sense-correct, validated) → curated word→emoji map → image → text.
// The stored emoji is validated so a stray letter/text the model returned can't render as the
// "visual"; a dead image URL falls through to text instead of a broken-image icon.
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
  const [imgFailed, setImgFailed] = useState(false)
  const glyph = (isEmoji(emoji) ? emoji : null) || wordToEmoji(word)
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
  if (imageUrl && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={word}
        onError={() => setImgFailed(true)}
        className={`object-contain ${className}`}
        draggable={false}
      />
    )
  }
  return (
    <span className={`flex items-center justify-center font-bold text-center ${className}`}>
      {word}
    </span>
  )
}
