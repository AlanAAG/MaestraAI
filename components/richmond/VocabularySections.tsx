import { Card } from '@/components/ui/card'
import type { SelectedRichmondContent } from '@/lib/richmond/types'

// Two clearly-separated vocabulary sources: read-only Richmond (book) vocab + the teacher's own.
// The teacher's words are NOT hand-picked — they're derived from the quincena's letters
// (Letra semana 1 + 2): every word of hers for those letters is included automatically.
export function VocabularySections({
  richmondContent,
  letters,
  teacherWords,
}: {
  richmondContent: SelectedRichmondContent | null
  letters: string[]
  teacherWords: string[]
}) {
  const hasRichmond = !!richmondContent && richmondContent.vocabulary.length > 0
  if (!hasRichmond && letters.length === 0) return null

  return (
    <Card className="space-y-5 border-2 p-6">
      <h3 className="text-sm font-semibold text-text-primary">
        Vocabulario <span className="font-normal text-text-secondary">(opcional)</span>
      </h3>

      {/* Section A — Richmond (read-only, pre-loaded) */}
      {hasRichmond && richmondContent && (
        <div data-testid="richmond-vocab-section">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium text-text-primary">📚 Vocabulario Richmond</h4>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">
              Unidad {richmondContent.unit_number} · Lecciones{' '}
              {richmondContent.lesson_ranges.join(', ')}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {richmondContent.vocabulary.map((w) => (
              <span
                key={w}
                className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-text-disabled"
              >
                {w}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-text-disabled">Pre-cargado de tu libro · no editable</p>
        </div>
      )}

      {/* Section B — teacher's own words, derived from the quincena's letters (read-only) */}
      <div data-testid="teacher-vocab-section">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-medium text-text-primary">✏️ Vocabulario de la maestra</h4>
          {letters.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">
              Letras {letters.join(', ')}
            </span>
          )}
        </div>
        {letters.length === 0 ? (
          <p className="text-xs text-text-secondary">
            Elige las letras de la quincena arriba para incluir tu vocabulario.
          </p>
        ) : teacherWords.length > 0 ? (
          <>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {teacherWords.map((w) => (
                <span
                  key={w}
                  className="rounded-full border border-border bg-primary/10 px-3 py-1 text-sm text-primary"
                >
                  {w}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-text-disabled">
              Tus palabras de las letras {letters.join(', ')} · se incluyen automáticamente
            </p>
          </>
        ) : (
          <p className="text-xs text-text-secondary">
            No tienes palabras para {letters.join(', ')} en tu vocabulario. Agrégalas en
            Vocabulario.
          </p>
        )}
      </div>
    </Card>
  )
}
