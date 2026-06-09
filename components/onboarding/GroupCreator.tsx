// components/onboarding/GroupCreator.tsx
// Form to create a new group during onboarding

'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface GroupData {
  name: string
  grade: string
  academic_year: string
  richmond_class_code?: string
  consentStudentData: boolean
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
    richmond_class_code: '',
    consentStudentData: false,
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
          Código de clase Richmond{' '}
          <span className="font-normal text-text-disabled">(opcional)</span>
        </label>
        <Input
          value={formData.richmond_class_code || ''}
          onChange={(e) => setFormData({ ...formData, richmond_class_code: e.target.value })}
          placeholder="Ej: grupo-kinder3a"
          className="min-h-[44px]"
        />
        <p className="text-xs text-text-disabled mt-1">
          El slug de la URL en richmondlp.com — necesario para sincronizar calificaciones
        </p>
      </div>

      <div className="pt-1">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.consentStudentData}
            onChange={(e) => setFormData({ ...formData, consentStudentData: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-text-secondary">
            Acepto que los datos de mis alumnos sean tratados conforme al{' '}
            <Link href="/privacidad" className="text-primary hover:underline" target="_blank">
              Aviso de Privacidad
            </Link>{' '}
            y transferidos a los proveedores indicados <span className="text-red-500">*</span>
          </span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={loading || !formData.name || !formData.grade || !formData.consentStudentData}
        className="w-full min-h-[44px] bg-primary hover:bg-primary-dark disabled:opacity-50"
      >
        {loading ? 'Creando grupo...' : 'Crear grupo'}
      </Button>
    </form>
  )
}
