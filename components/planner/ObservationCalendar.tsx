'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

type ObsCalendar = Record<string, string[]>

const DAYS = [
  { key: 'lunes', label: 'L' },
  { key: 'martes', label: 'M' },
  { key: 'miercoles', label: 'M' },
  { key: 'jueves', label: 'J' },
  { key: 'viernes', label: 'V' },
]

interface Props {
  students: string[]
  value: ObsCalendar
  onChange: (v: ObsCalendar) => void
}

export function ObservationCalendar({ students, value, onChange }: Props) {
  const [input, setInput] = useState<Record<string, string>>({})

  function toggle(day: string, name: string) {
    const current = value[day] ?? []
    const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name]
    onChange({ ...value, [day]: next })
  }

  function addManual(day: string) {
    const name = (input[day] ?? '').trim()
    if (!name) return
    if (!(value[day] ?? []).includes(name)) {
      onChange({ ...value, [day]: [...(value[day] ?? []), name] })
    }
    setInput((prev) => ({ ...prev, [day]: '' }))
  }

  return (
    <div className="grid grid-cols-5 gap-2">
      {DAYS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="text-center text-xs font-semibold text-text-secondary py-1 bg-muted rounded">
            {label}
          </div>
          {/* DB students */}
          {students.map((name) => {
            const selected = (value[key] ?? []).includes(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(key, name)}
                className={`w-full text-left px-2 py-1 rounded text-xs border transition-colors ${
                  selected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-text-secondary border-border hover:border-primary'
                }`}
              >
                {name}
              </button>
            )
          })}
          {/* Selected that aren't in DB list */}
          {(value[key] ?? [])
            .filter((n) => !students.includes(n))
            .map((name) => (
              <span
                key={name}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary/10 text-primary border border-primary/20"
              >
                <span className="flex-1 truncate">{name}</span>
                <button type="button" onClick={() => toggle(key, name)}>
                  <X size={9} />
                </button>
              </span>
            ))}
          {/* Manual input */}
          <input
            type="text"
            value={input[key] ?? ''}
            onChange={(e) => setInput((prev) => ({ ...prev, [key]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addManual(key)
              }
            }}
            placeholder="+ nombre"
            className="w-full px-2 py-1 rounded text-xs border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      ))}
    </div>
  )
}
