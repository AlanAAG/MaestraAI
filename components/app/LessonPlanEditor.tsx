'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { CAMPOS_FORMATIVOS, EJES_ARTICULADORES } from '@/lib/nem-official-data'

const LessonBlockSchema = z.object({
  time: z.string().min(1, 'Hora requerida'),
  activity: z.string().min(1, 'Actividad requerida'),
  methodology: z.string().min(1, 'Metodología requerida'),
  materials: z.array(z.string()),
  nem_field: z.string().min(1, 'Campo formativo requerido'),
  nem_axis: z.string().min(1, 'Eje articulador requerido'),
})

const UpdateLessonPlanSchema = z.object({
  blocks: z.array(LessonBlockSchema),
  vocabulary: z.array(z.string()),
  observation_students: z.array(z.string()),
  nee_reminders: z.array(z.string()),
})

type LessonBlock = z.infer<typeof LessonBlockSchema>
type UpdateLessonPlan = z.infer<typeof UpdateLessonPlanSchema>

type VocabularyItem = {
  id: string
  word: string
  letter: string
}

type LessonPlan = {
  id: string
  day_number: number
  date: string
  day_of_week: string
  blocks: LessonBlock[]
  vocabulary: string[]
  observation_students: string[]
  nee_reminders: string[]
  approved: boolean
}

interface LessonPlanEditorProps {
  lessonPlan: LessonPlan
  vocabularyItems: VocabularyItem[]
  onSave: (updatedPlan: LessonPlan) => void
  onCancel: () => void
}

export function LessonPlanEditor({
  lessonPlan,
  vocabularyItems,
  onSave,
  onCancel,
}: LessonPlanEditorProps) {
  const [blocks, setBlocks] = useState<LessonBlock[]>(lessonPlan.blocks)
  const [vocabulary, setVocabulary] = useState<string[]>(lessonPlan.vocabulary)
  const [observationStudents, setObservationStudents] = useState<string[]>(
    lessonPlan.observation_students
  )
  const [neeReminders, setNeeReminders] = useState<string[]>(lessonPlan.nee_reminders)
  const [saving, setSaving] = useState(false)
  const [vocabInput, setVocabInput] = useState('')
  const [showVocabSuggestions, setShowVocabSuggestions] = useState(false)
  const [observationInput, setObservationInput] = useState('')
  const [neeInput, setNeeInput] = useState('')

  const filteredVocabulary = vocabInput
    ? vocabularyItems.filter((item) => item.word.toLowerCase().includes(vocabInput.toLowerCase()))
    : []

  function updateBlock(index: number, field: keyof LessonBlock, value: string | string[]) {
    const updated = [...blocks]
    updated[index] = { ...updated[index], [field]: value }
    setBlocks(updated)
  }

  function addMaterial(blockIndex: number, material: string) {
    if (!material.trim()) return
    const updated = [...blocks]
    updated[blockIndex].materials = [...updated[blockIndex].materials, material.trim()]
    setBlocks(updated)
  }

  function removeMaterial(blockIndex: number, materialIndex: number) {
    const updated = [...blocks]
    updated[blockIndex].materials = updated[blockIndex].materials.filter(
      (_, i) => i !== materialIndex
    )
    setBlocks(updated)
  }

  function addVocabulary(word: string) {
    if (!word.trim() || vocabulary.includes(word.trim())) return
    setVocabulary([...vocabulary, word.trim()])
    setVocabInput('')
    setShowVocabSuggestions(false)
  }

  function removeVocabulary(word: string) {
    setVocabulary(vocabulary.filter((v) => v !== word))
  }

  function addObservationStudent(name: string) {
    if (!name.trim() || observationStudents.includes(name.trim())) return
    setObservationStudents([...observationStudents, name.trim()])
    setObservationInput('')
  }

  function removeObservationStudent(name: string) {
    setObservationStudents(observationStudents.filter((s) => s !== name))
  }

  function addNeeReminder(reminder: string) {
    if (!reminder.trim()) return
    setNeeReminders([...neeReminders, reminder.trim()])
    setNeeInput('')
  }

  function removeNeeReminder(index: number) {
    setNeeReminders(neeReminders.filter((_, i) => i !== index))
  }

  async function handleSave() {
    try {
      const data: UpdateLessonPlan = {
        blocks,
        vocabulary,
        observation_students: observationStudents,
        nee_reminders: neeReminders,
      }

      UpdateLessonPlanSchema.parse(data)

      setSaving(true)

      const response = await fetch('/api/planner/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_plan_id: lessonPlan.id,
          ...data,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }

      const result = await response.json()
      toast.success('Planeación actualizada')
      onSave(result.lesson_plan)
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error('Faltan campos requeridos')
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Error al guardar cambios')
      }
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6 bg-surface rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          Editar Día {lessonPlan.day_number}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
            {saving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary">Bloques de actividades</h4>
        {blocks.map((block, blockIndex) => (
          <div key={blockIndex} className="p-4 bg-bg rounded-lg border border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Hora</label>
                <Input
                  value={block.time}
                  onChange={(e) => updateBlock(blockIndex, 'time', e.target.value)}
                  placeholder="9:00 - 9:30"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  Metodología
                </label>
                <Input
                  value={block.methodology}
                  onChange={(e) => updateBlock(blockIndex, 'methodology', e.target.value)}
                  placeholder="Juego"
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">
                Actividad
              </label>
              <Textarea
                value={block.activity}
                onChange={(e) => updateBlock(blockIndex, 'activity', e.target.value)}
                placeholder="Descripción de la actividad..."
                className="min-h-[60px]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">
                Materiales
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {block.materials.map((material, matIndex) => (
                  <Badge
                    key={matIndex}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => removeMaterial(blockIndex, matIndex)}
                  >
                    {material}
                    <X size={12} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Agregar material"
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addMaterial(blockIndex, e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  Campo Formativo
                </label>
                <select
                  value={block.nem_field}
                  onChange={(e) => updateBlock(blockIndex, 'nem_field', e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {CAMPOS_FORMATIVOS.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  Eje Articulador
                </label>
                <select
                  value={block.nem_axis}
                  onChange={(e) => updateBlock(blockIndex, 'nem_axis', e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {EJES_ARTICULADORES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-semibold text-text-primary mb-2 block">
          Vocabulario del día
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {vocabulary.map((word, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 bg-info-light text-info-text cursor-pointer hover:opacity-80"
              onClick={() => removeVocabulary(word)}
            >
              {word}
              <X size={12} />
            </Badge>
          ))}
        </div>
        <div className="relative">
          <Input
            value={vocabInput}
            onChange={(e) => {
              setVocabInput(e.target.value)
              setShowVocabSuggestions(e.target.value.length > 0)
            }}
            onFocus={() => setShowVocabSuggestions(vocabInput.length > 0)}
            onBlur={() => setTimeout(() => setShowVocabSuggestions(false), 200)}
            placeholder="Buscar o escribir palabra..."
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && vocabInput) {
                e.preventDefault()
                addVocabulary(vocabInput)
              }
            }}
          />
          {showVocabSuggestions && filteredVocabulary.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-md shadow-lg max-h-48 overflow-auto">
              {filteredVocabulary.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addVocabulary(item.word)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-bg flex items-center justify-between"
                >
                  <span className="text-text-primary">{item.word}</span>
                  <span className="text-xs text-text-secondary">{item.letter}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-text-primary mb-2 block">
          Estudiantes a observar
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {observationStudents.map((name, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 bg-brand-subtle text-brand cursor-pointer hover:bg-brand-light"
              onClick={() => removeObservationStudent(name)}
            >
              {name}
              <X size={12} />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={observationInput}
            onChange={(e) => setObservationInput(e.target.value)}
            placeholder="Nombre del estudiante"
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && observationInput) {
                e.preventDefault()
                addObservationStudent(observationInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addObservationStudent(observationInput)}
            disabled={!observationInput.trim()}
            className="h-9"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-text-primary mb-2 block">
          Recordatorios NEE
        </label>
        <div className="space-y-2 mb-2">
          {neeReminders.map((reminder, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-2 bg-error-light rounded border border-error/30"
            >
              <span className="text-sm text-error-text flex-1">{reminder}</span>
              <button
                type="button"
                onClick={() => removeNeeReminder(index)}
                className="text-error hover:text-error-text"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={neeInput}
            onChange={(e) => setNeeInput(e.target.value)}
            placeholder="Agregar recordatorio..."
            className="min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && neeInput) {
                e.preventDefault()
                addNeeReminder(neeInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addNeeReminder(neeInput)}
            disabled={!neeInput.trim()}
            className="h-auto"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
