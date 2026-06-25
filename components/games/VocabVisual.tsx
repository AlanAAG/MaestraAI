import { wordToEmoji } from '@/lib/materials/emoji'

// The single visual seam for every game. Resolution order:
//   stored emoji (AI sense-correct) → curated word→emoji map → Unsplash image → text fallback.
// Swap the image branch later for a real/gen-AI source without touching any game.
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
  const glyph = emoji || wordToEmoji(word)
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
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={word} className={`object-contain ${className}`} draggable={false} />
    )
  }
  return (
    <span className={`flex items-center justify-center font-bold text-center ${className}`}>
      {word}
    </span>
  )
}
