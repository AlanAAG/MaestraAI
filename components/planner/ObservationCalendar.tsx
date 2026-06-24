'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

type ObsCalendar = Record<string, string[]>

const DAYS: [string, string][] = [
  ['lunes', 'Lunes'],
  ['martes', 'Martes'],
  ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'],
  ['viernes', 'Viernes'],
]

interface Props {
  // All of the teacher's student names (across groups) — used as the autocomplete source.
  students: string[]
  value: ObsCalendar
  onChange: (v: ObsCalendar) => void
}

export function ObservationCalendar({ students, value, onChange }: Props) {
  const [input, setInput] = useState<Record<string, string>>({})
  const [focused, setFocused] = useState<string | null>(null)

  function add(day: string, name: string) {
    const n = name.trim()
    if (!n) return
    if (!(value[day] ?? []).includes(n)) {
      onChange({ ...value, [day]: [...(value[day] ?? []), n] })
    }
    setInput((p) => ({ ...p, [day]: '' }))
  }

  function remove(day: string, name: string) {
    onChange({ ...value, [day]: (value[day] ?? []).filter((x) => x !== name) })
  }

  return (
    <div className="space-y-2">
      {DAYS.map(([key, label]) => {
        const q = (input[key] ?? '').toLowerCase().trim()
        const selected = value[key] ?? []
        const matches = q
          ? students.filter((s) => s.toLowerCase().includes(q) && !selected.includes(s)).slice(0, 6)
          : []
        return (
          <div
            key={key}
            className="flex flex-col sm:flex-row sm:items-start gap-2 border border-border rounded-lg p-2"
          >
            <div className="w-24 shrink-0 text-xs font-semibold text-text-secondary pt-1.5">
              {label}
            </div>
            <div className="flex-1 min-w-0">
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {selected.map((name) => (
                    <span
                      key={name}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                    >
                      {name}
                      <button type="button" onClick={() => remove(key, name)} aria-label="Quitar">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={input[key] ?? ''}
                  onChange={(e) => setInput((p) => ({ ...p, [key]: e.target.value }))}
                  onFocus={() => setFocused(key)}
                  onBlur={() => setTimeout(() => setFocused((f) => (f === key ? null : f)), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      add(key, matches[0] ?? input[key] ?? '')
                    }
                  }}
                  placeholder="Escribe un nombre (ej. Ra → Raúl)…"
                  className="w-full px-2 py-1.5 rounded text-xs border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {focused === key && matches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-w-xs rounded-lg border border-border bg-surface shadow-lg py-1">
                    {matches.map((name) => (
                      <button
                        key={name}
                        type="button"
                        // onMouseDown (not onClick) fires before the input's blur hides the list
                        onMouseDown={(e) => {
                          e.preventDefault()
                          add(key, name)
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-muted"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
