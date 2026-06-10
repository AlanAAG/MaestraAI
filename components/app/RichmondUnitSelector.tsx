'use client'
import { useEffect, useState } from 'react'

type UnitOption = {
  assignment_id: string
  title: string
  due_at: string
  group_name: string
  suggested: boolean
}

type Props = {
  startDate: string
  endDate: string
  value: string
  onChange: (value: string) => void
}

export function RichmondUnitSelector({ startDate, endDate, value, onChange }: Props) {
  const [units, setUnits] = useState<UnitOption[]>([])
  const [loading, setLoading] = useState(true)
  const [manualMode, setManualMode] = useState(false)

  useEffect(() => {
    if (!startDate || !endDate) return
    setLoading(true)
    fetch(`/api/richmond/available-units?start=${startDate}&end=${endDate}`)
      .then((r) => r.json())
      .then((d: { units?: UnitOption[] }) => {
        const fetched = d.units ?? []
        setUnits(fetched)
        // Auto-select the first suggested unit if nothing is selected yet
        if (!value && fetched.length > 0 && fetched[0].suggested) {
          onChange(fetched[0].title)
        }
      })
      .catch(() => setUnits([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  if (loading) {
    return <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
  }

  if (units.length === 0 && !manualMode) {
    return (
      <div className="text-sm text-gray-400 flex items-center gap-2">
        <span>No hay asignaciones de Richmond sincronizadas.</span>
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="text-blue-600 hover:underline"
        >
          Escribir manualmente
        </button>
      </div>
    )
  }

  if (manualMode) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ej: Unit 3 – Wild Animals"
          className="flex-1 h-10 px-3 rounded-md border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {units.length > 0 && (
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Ver lista
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">— Ninguna (opcional) —</option>
        {units.map((u) => (
          <option key={u.assignment_id} value={u.title}>
            {u.suggested ? '★ ' : ''}
            {u.title}
            {u.group_name ? ` (${u.group_name})` : ''}
          </option>
        ))}
      </select>
      <div className="flex items-center justify-between">
        {units.some((u) => u.suggested) && (
          <p className="text-xs text-blue-600">★ Recomendada según las fechas de la quincena</p>
        )}
        <button
          type="button"
          onClick={() => {
            setManualMode(true)
            onChange('')
          }}
          className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
        >
          Escribir manualmente
        </button>
      </div>
    </div>
  )
}
