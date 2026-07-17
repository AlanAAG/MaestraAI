// Initials-only avatar (no photos). Deterministic, brand-tokened, no deps.
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'M'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function InitialsAvatar({
  name,
  size = 36,
  className = '',
}: {
  name: string | null | undefined
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand text-white font-display font-medium leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initialsOf(name)}
    </span>
  )
}
