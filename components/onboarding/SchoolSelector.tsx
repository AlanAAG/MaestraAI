// components/onboarding/SchoolSelector.tsx
// Dropdown to select existing school or create new one

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface School {
  id: string
  name: string
  state: string
}

interface SchoolSelectorProps {
  value: string | null
  onChange: (schoolId: string | null) => void
  onCreateNew: () => void
}

export function SchoolSelector({ value, onChange, onCreateNew }: SchoolSelectorProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSchools()
  }, [])

  async function loadSchools() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('schools')
      .select('id, name, state')
      .order('name')

    if (!error && data) {
      setSchools(data)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <select
        value={value || ''}
        onChange={(e) => {
          const val = e.target.value
          if (val === '__CREATE_NEW__') {
            onCreateNew()
          } else {
            onChange(val || null)
          }
        }}
        disabled={loading}
        className="w-full min-h-[44px] px-3 rounded-lg border border-border bg-surface text-text-primary
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="">{loading ? 'Cargando escuelas...' : 'Selecciona tu escuela'}</option>
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name} ({school.state})
          </option>
        ))}
        <option value="__CREATE_NEW__">➕ Crear nueva escuela</option>
      </select>

      {schools.length === 0 && !loading && (
        <p className="text-sm text-text-secondary">
          No hay escuelas registradas. Crea una nueva para continuar.
        </p>
      )}
    </div>
  )
}
