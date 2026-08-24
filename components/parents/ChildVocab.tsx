// Kid-friendly vocabulary cards: the teacher's drawing when it exists, else the word's
// letter on its color. Purely presentational (server-renderable).
import type { VocabCard } from '@/lib/parents/child-data'

export function ChildVocab({ cards }: { cards: VocabCard[] }) {
  if (!cards.length) {
    return (
      <p className="text-text-secondary text-sm">
        La maestra aún no ha publicado el vocabulario de esta quincena.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.word}
          className="bg-surface border border-border rounded-2xl p-3 text-center flex flex-col items-center gap-2"
        >
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt={c.word} className="h-20 w-20 object-contain rounded-xl" />
          ) : (
            <span
              className="flex h-20 w-20 items-center justify-center rounded-xl text-4xl font-bold text-white"
              style={{ backgroundColor: c.colorHex ?? 'var(--color-primary, #6366f1)' }}
            >
              {(c.letter ?? c.word.charAt(0)).toUpperCase()}
            </span>
          )}
          <p className="text-base font-semibold text-text-primary capitalize">{c.word}</p>
        </div>
      ))}
    </div>
  )
}
