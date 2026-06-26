import { X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { SelectedRichmondContent } from '@/lib/richmond/types'

type VocabWord = { id: string; word: string; letter: string }

// Two clearly-separated vocabulary sources: read-only Richmond (book) vocab + the teacher's own.
export function VocabularySections({
  richmondContent,
  allVocab,
  selectedVocab,
  onToggle,
}: {
  richmondContent: SelectedRichmondContent | null
  allVocab: VocabWord[]
  selectedVocab: string[]
  onToggle: (word: string) => void
}) {
  const hasRichmond = !!richmondContent && richmondContent.vocabulary.length > 0
  if (!hasRichmond && allVocab.length === 0) return null

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

      {/* Section B — teacher's own (editable) */}
      <div data-testid="teacher-vocab-section">
        <h4 className="mb-2 text-sm font-medium text-text-primary">✏️ Vocabulario de la maestra</h4>
        {allVocab.length > 0 ? (
          <>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {allVocab.map((v) => {
                const selected = selectedVocab.includes(v.word)
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onToggle(v.word)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      selected
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-text-secondary hover:border-primary'
                    }`}
                  >
                    {selected && <X size={10} className="mr-1 inline" />}
                    {v.word}
                  </button>
                )
              })}
            </div>
            {selectedVocab.length > 0 && (
              <p className="mt-2 text-xs text-primary">
                {selectedVocab.length} palabra{selectedVocab.length !== 1 ? 's' : ''} seleccionada
                {selectedVocab.length !== 1 ? 's' : ''}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-text-secondary">
            Agrega palabras adicionales para esta quincena…
          </p>
        )}
      </div>
    </Card>
  )
}
