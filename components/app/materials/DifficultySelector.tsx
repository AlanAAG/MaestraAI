'use client'

export type Difficulty = 'kinder' | 'standard'

interface DifficultySelectorProps {
  value: Difficulty
  onChange: (v: Difficulty) => void
}

const OPTIONS: { id: Difficulty; label: string; sub: string }[] = [
  { id: 'kinder', label: 'Kinder', sub: '8×8 · horizontal' },
  { id: 'standard', label: 'Estándar', sub: '12×12 · todas direcciones' },
]

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors ${
            value === opt.id
              ? 'border-brand bg-brand-subtle text-brand'
              : 'border-border bg-card text-text-secondary hover:bg-inset'
          }`}
        >
          <div className="text-sm font-medium">{opt.label}</div>
          <div className="text-xs text-text-muted mt-0.5">{opt.sub}</div>
        </button>
      ))}
    </div>
  )
}
