'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Check } from 'lucide-react'

type RubricValue = 'si' | 'en_proceso' | 'no' | null

interface RubricEditorProps {
  students: Array<{ id: string; name: string }>
  initialValues?: Record<string, RubricValue>
  onSave?: (values: Record<string, RubricValue>) => Promise<void>
}

const RUBRIC_OPTIONS: Array<{ value: RubricValue; label: string; color: string }> = [
  { value: 'si', label: 'Sí', color: 'bg-success text-white' },
  { value: 'en_proceso', label: 'En proceso', color: 'bg-warning text-white' },
  { value: 'no', label: 'No', color: 'bg-destructive text-white' },
]

export function RubricEditor({ students, initialValues = {}, onSave }: RubricEditorProps) {
  const [values, setValues] = useState<Record<string, RubricValue>>(initialValues)
  const [saving, setSaving] = useState(false)

  async function handleChange(studentId: string, value: RubricValue) {
    const newValues = { ...values, [studentId]: value }
    setValues(newValues)

    // Optimistic save
    if (onSave) {
      setSaving(true)
      try {
        await onSave(newValues)
      } catch (error) {
        console.error('Save error:', error)
        // Revert on error
        setValues(values)
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-primary-light p-4 border-b border-border">
        <h3 className="font-semibold text-text-primary">Rúbrica de Evaluación</h3>
        <p className="text-sm text-text-secondary mt-1">
          Evaluación cualitativa - Sin calificaciones numéricas
        </p>
      </div>

      <div className="divide-y divide-border">
        {students.map((student) => (
          <div key={student.id} className="p-4 hover:bg-bg transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">{student.name}</span>
              <div className="flex gap-2">
                {RUBRIC_OPTIONS.map((option) => {
                  const isSelected = values[student.id] === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleChange(student.id, option.value)}
                      className={`
                        min-w-[90px] px-3 py-2 rounded-lg text-xs font-medium transition-all
                        ${
                          isSelected
                            ? option.color
                            : 'bg-surface border border-border text-text-secondary hover:border-primary'
                        }
                      `}
                      disabled={saving}
                    >
                      <span className="flex items-center justify-center gap-1">
                        {isSelected && <Check size={12} />}
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {saving && (
        <div className="px-4 py-2 bg-bg border-t border-border">
          <p className="text-xs text-text-secondary">Guardando...</p>
        </div>
      )}
    </Card>
  )
}
