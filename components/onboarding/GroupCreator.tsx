// components/onboarding/GroupCreator.tsx
// Form to create a new group during onboarding

'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface GroupData {
  name: string
  grade: string
  academic_year: string
  richmond_group_slug: string
}

interface GroupCreatorProps {
  onSubmit: (data: GroupData) => void
  loading?: boolean
}

const CURRENT_YEAR = new Date().getFullYear()
const GRADES = ['Maternal', 'Kinder 1', 'Kinder 2', 'Kinder 3', 'Preprimaria A', 'Preprimaria B']

export function GroupCreator({ onSubmit, loading = false }: GroupCreatorProps) {
  const [formData, setFormData] = useState<GroupData>({
    name: '',
    grade: '',
    academic_year: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
    richmond_group_slug: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Nombre del grupo
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Kinder 3A, Grupo Mariposas"
          required
          className="min-h-[44px]"
          autoFocus
        />
        <p className="text-xs text-text-disabled mt-1">
          Un nombre que te ayude a identificar el grupo
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Grado</label>
        <select
          value={formData.grade}
          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
          required
          className="w-full min-h-[44px] px-3 rounded-lg border border-border bg-surface text-text-primary
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Selecciona el grado</option>
          {GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Año escolar</label>
        <Input
          value={formData.academic_year}
          onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
          placeholder="2025-2026"
          required
          className="min-h-[44px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Richmond Group Slug (opcional)
        </label>
        <Input
          value={formData.richmond_group_slug}
          onChange={(e) => setFormData({ ...formData, richmond_group_slug: e.target.value })}
          placeholder="Ej: grupo-aca6e"
          className="min-h-[44px]"
        />
        <p className="text-xs text-text-disabled mt-1">
          Si usas Richmond LP, encuentra esto en la URL del curso (e.g., /courses/
          <span className="font-mono">grupo-aca6e</span>/markbook)
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading || !formData.name || !formData.grade}
        className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
      >
        {loading ? 'Creando grupo...' : 'Crear grupo'}
      </Button>
    </form>
  )
}
