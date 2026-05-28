// components/onboarding/SchoolCreator.tsx
// Inline form to create a new school during onboarding

'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SchoolData {
  name: string
  city: string
}

interface SchoolCreatorProps {
  onSubmit: (data: SchoolData) => void
  onCancel: () => void
  loading?: boolean
}

export function SchoolCreator({ onSubmit, onCancel, loading = false }: SchoolCreatorProps) {
  const [formData, setFormData] = useState<SchoolData>({
    name: '',
    city: '',
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

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || !formData.name || !formData.city}
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
