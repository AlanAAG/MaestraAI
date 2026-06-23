// components/settings/GroupEditor.tsx
// Create or edit group details

'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const DAY_OPTIONS = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
]

interface GroupData {
  name: string
  grade: string
  academic_year: string
  richmond_class_code?: string
  letter_number_day?: string
  numeros_day?: string
}

interface GroupEditorProps {
  initialData?: GroupData
  onSubmit: (data: GroupData) => void
  onCancel: () => void
  loading?: boolean
}

const GRADES = ['Maternal', 'Kinder 1', 'Kinder 2', 'Kinder 3', 'Preprimaria A', 'Preprimaria B']

export function GroupEditor({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: GroupEditorProps) {
  const [formData, setFormData] = useState<GroupData>(
    initialData || {
      name: '',
      grade: '',
      academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      richmond_class_code: '',
      letter_number_day: 'martes',
      numeros_day: 'jueves',
    }
  )

  useEffect(() => {
    if (initialData) {
      setFormData({
        letter_number_day: 'martes',
        numeros_day: 'jueves',
        ...initialData,
      })
    }
  }, [initialData])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(formData)
  }

  const isEdit = !!initialData

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
        />
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
          <span className="font-normal text-text-disabled">(automático)</span>
        </label>
        <Input
          value={formData.richmond_class_code || ''}
          onChange={(e) => setFormData({ ...formData, richmond_class_code: e.target.value })}
          placeholder="Se vincula solo desde la extensión"
          className="min-h-[44px]"
        />
        <p className="text-xs text-text-disabled mt-1">
          La extensión de Chrome lo llena automáticamente al vincular el grupo. Solo edítalo
          manualmente si necesitas corregirlo.
        </p>
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-sm font-medium text-text-secondary mb-3">
          Horario de actividades especiales
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Día de Letter &amp; Number
            </label>
            <select
              value={formData.letter_number_day ?? 'martes'}
              onChange={(e) => setFormData({ ...formData, letter_number_day: e.target.value })}
              className="w-full min-h-[44px] px-3 rounded-lg border border-border bg-surface text-text-primary text-sm
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Día de Números</label>
            <select
              value={formData.numeros_day ?? 'jueves'}
              onChange={(e) => setFormData({ ...formData, numeros_day: e.target.value })}
              className="w-full min-h-[44px] px-3 rounded-lg border border-border bg-surface text-text-primary text-sm
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || !formData.name || !formData.grade}
          className="flex-1 min-h-[44px] bg-primary hover:bg-primary-dark"
        >
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear grupo'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="min-h-[44px]">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
