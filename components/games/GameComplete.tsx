import { CheckCircle } from 'lucide-react'

// Shared win/complete screen for the games (was copy-pasted ~4 times). `children` is an
// optional slot for game-specific extras (e.g. the sorting tally chips).
export function GameComplete({
  title,
  sub,
  onReplay,
  children,
}: {
  title: string
  sub?: string
  onReplay?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <CheckCircle className="h-16 w-16 text-emerald-500" />
      <p className="text-2xl font-bold text-gray-800">{title}</p>
      {sub && <p className="text-sm text-gray-500">{sub}</p>}
      {children}
      {onReplay && (
        <button
          onClick={onReplay}
          className="mt-2 min-h-[44px] rounded-xl bg-indigo-600 px-6 font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Jugar de nuevo
        </button>
      )}
    </div>
  )
}
