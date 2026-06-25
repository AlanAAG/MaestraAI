// Shared progress bar for the step-by-step games (was copy-pasted in 3 of them).
// `current` is the 0-based index of the current item.
export function GameProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-indigo-400 transition-all duration-500"
          style={{ width: `${total ? (current / total) * 100 : 0}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-gray-400">
        {Math.min(current + 1, total)}/{total}
      </span>
    </div>
  )
}
