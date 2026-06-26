'use client'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getUnitsByBook, getUnitWithGroups, mergeSelectedContent } from '@/lib/richmond/queries'
import type {
  RichmondUnit,
  RichmondUnitWithGroups,
  SelectedRichmondContent,
} from '@/lib/richmond/types'

export type RichmondSelection = {
  book_code: string
  unit_id: string
  lesson_group_ids: string[]
}

type Props = {
  onChange: (sel: RichmondSelection) => void
  onResolved?: (content: SelectedRichmondContent | null) => void
  // Injectable for tests; default to the live public-read queries via the browser client.
  loadUnits?: (bookCode: string) => Promise<RichmondUnit[]>
  loadUnit?: (unitId: string) => Promise<RichmondUnitWithGroups | null>
}

const BOOK_CODE = 'TG5A'

export function UnitSelector({ onChange, onResolved, loadUnits, loadUnit }: Props) {
  const [units, setUnits] = useState<RichmondUnit[]>([])
  const [unitId, setUnitId] = useState('')
  const [unit, setUnit] = useState<RichmondUnitWithGroups | null>(null)
  const [lessonGroupIds, setLessonGroupIds] = useState<string[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)

  const fetchUnits = loadUnits ?? ((bc: string) => getUnitsByBook(createClient(), bc))
  const fetchUnit = loadUnit ?? ((id: string) => getUnitWithGroups(createClient(), id))

  useEffect(() => {
    fetchUnits(BOOK_CODE).then(setUnits)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUnitChange(id: string) {
    setUnitId(id)
    setLessonGroupIds([]) // reset selected lesson groups when the unit changes
    onChange({ book_code: BOOK_CODE, unit_id: id, lesson_group_ids: [] })
    onResolved?.(null)
    setUnit(id ? await fetchUnit(id) : null)
  }

  function toggleGroup(groupId: string) {
    const next = lessonGroupIds.includes(groupId)
      ? lessonGroupIds.filter((g) => g !== groupId)
      : [...lessonGroupIds, groupId]
    setLessonGroupIds(next)
    onChange({ book_code: BOOK_CODE, unit_id: unitId, lesson_group_ids: next })
    onResolved?.(unit && next.length ? mergeSelectedContent(unit, next) : null)
  }

  const preview = unit && lessonGroupIds.length ? mergeSelectedContent(unit, lessonGroupIds) : null

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-text-primary">📚 Unidad Richmond (PRONI)</p>

      {/* Row 1: book (static) */}
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Libro</label>
        <select
          aria-label="Libro"
          value={BOOK_CODE}
          disabled
          className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm"
        >
          <option value={BOOK_CODE}>{BOOK_CODE}</option>
        </select>
      </div>

      {/* Row 2: unit */}
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Unidad</label>
        <select
          aria-label="Unidad"
          value={unitId}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Selecciona una unidad…</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              Unidad {u.unit_number} – {u.unit_title}
            </option>
          ))}
        </select>
      </div>

      {/* Row 3: lesson groups */}
      {unit && (
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Lecciones</label>
          <div className="grid grid-cols-2 gap-2">
            {unit.lesson_groups.map((g) => (
              <label
                key={g.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={lessonGroupIds.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                  className="h-4 w-4 accent-primary"
                />
                <span>
                  {g.lesson_range}{' '}
                  <span className="text-text-secondary">
                    (lecciones {g.lesson_start}–{g.lesson_end})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary"
          >
            {previewOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            Ver contenido seleccionado
          </button>
          {previewOpen && (
            <div className="space-y-3 px-3 pb-3 text-sm">
              <div>
                <p className="mb-1 text-xs font-semibold text-text-secondary">Vocabulario</p>
                {preview.vocabulary.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.vocabulary.map((w) => (
                      <span key={w} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {w}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-disabled">Sin vocabulario cargado aún</p>
                )}
              </div>
              {preview.language_models.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-text-secondary">Frases modelo</p>
                  <ul className="list-disc pl-5 text-xs text-text-secondary">
                    {preview.language_models.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {preview.learning_goals.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-text-secondary">
                    Objetivos de aprendizaje
                  </p>
                  <ul className="list-disc pl-5 text-xs text-text-secondary">
                    {preview.learning_goals.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
