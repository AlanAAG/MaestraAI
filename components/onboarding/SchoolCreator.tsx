// components/onboarding/SchoolCreator.tsx
// Inline form to create a new school during onboarding

'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const MEXICAN_STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
]

interface SchoolData {
  name: string
  state: string
}

interface SchoolCreatorProps {
  onSubmit: (data: SchoolData) => void
  onCancel: () => void
  loading?: boolean
}

export function SchoolCreator({ onSubmit, onCancel, loading = false }: SchoolCreatorProps) {
  const [formData, setFormData] = useState<SchoolData>({
    name: '',
    state: 'Ciudad de México',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Nombre de la escuela
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Colegio Americano de México"
          required
          className="min-h-[44px]"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
        <select
          value={formData.state}
          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          required
          className="w-full min-h-[44px] px-3 rounded-lg border border-border bg-surface text-text-primary
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          {MEXICAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || !formData.name || !formData.state}
          className="flex-1 min-h-[44px] bg-primary hover:bg-primary-dark"
        >
          {loading ? 'Creando...' : 'Crear escuela'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="min-h-[44px]">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
