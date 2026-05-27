// components/onboarding/SchoolCreator.tsx
// Inline form to create a new school during onboarding

'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SchoolData {
  name: string
  city: string
  state: string
}

interface SchoolCreatorProps {
  onSubmit: (data: SchoolData) => void
  onCancel: () => void
  loading?: boolean
}

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

export function SchoolCreator({ onSubmit, onCancel, loading = false }: SchoolCreatorProps) {
  const [formData, setFormData] = useState<SchoolData>({
    name: '',
    city: '',
    state: '',
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
        <label className="block text-sm font-medium text-text-secondary mb-1">Ciudad</label>
        <Input
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="Ej: Ciudad de México"
          required
          className="min-h-[44px]"
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
          <option value="">Selecciona el estado</option>
          {MEXICAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || !formData.name || !formData.city || !formData.state}
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
