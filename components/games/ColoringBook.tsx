'use client'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ColoringCanvas } from './ColoringCanvas'
import { GameProgress } from './GameProgress'
import { normalizeWorksheetItems, type WorksheetActivity } from '@/lib/materials/worksheet-content'
import type { GameResult } from '@/hooks/useGameScore'

/** The coloring activities of a worksheet, one big picture at a time, colorable on screen. */
export function ColoringBook({
  activities,
  onComplete,
}: {
  activities: WorksheetActivity[]
  onComplete?: (result?: GameResult) => void
}) {
  const pages = useMemo(
    () =>
      (activities ?? [])
        .filter((a) => a?.type === 'coloring')
        .flatMap((a) =>
          normalizeWorksheetItems(a.items).map((it) => ({
            word: it.word,
            instruction: it.teacher_instruction ?? a.teacher_instruction,
          }))
        )
        .filter((p) => p.word),
    [activities]
  )
  const [index, setIndex] = useState(0)

  if (!pages.length) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-sm">Esta hoja no tiene dibujos para colorear.</p>
      </div>
    )
  }

  const page = pages[index]
  const last = index === pages.length - 1

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {pages.length > 1 && <GameProgress current={index} total={pages.length} />}
      {/* key: a new page starts on a clean canvas instead of inheriting the last drawing */}
      <ColoringCanvas key={page.word + index} word={page.word} instruction={page.instruction} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="Dibujo anterior"
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border-4 border-gray-200 bg-white text-gray-700 transition-colors duration-200 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() =>
            last
              ? onComplete?.({ correct: pages.length, total: pages.length })
              : setIndex((i) => i + 1)
          }
          className="flex h-14 cursor-pointer items-center gap-2 rounded-2xl border-4 border-primary bg-primary px-6 text-lg font-semibold text-white transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          {last ? '¡Terminé!' : 'Siguiente'}
          {!last && <ChevronRight className="h-6 w-6" />}
        </button>
      </div>
    </div>
  )
}
