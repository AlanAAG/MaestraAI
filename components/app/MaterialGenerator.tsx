'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

type MaterialType = 'flashcards' | 'worksheets' | 'games' | 'youtube'

type MaterialGeneratorProps = {
  lessonPlanId: string
  onClose: () => void
  onSuccess: () => void
}

const MATERIAL_OPTIONS: Array<{ id: MaterialType; label: string; description: string }> = [
  {
    id: 'flashcards',
    label: 'Flashcards',
    description: 'Tarjetas con vocabulario en inglés y definiciones',
  },
  {
    id: 'worksheets',
    label: 'Worksheets',
    description: 'Actividades de trazado, asociación y ordenamiento',
  },
  {
    id: 'games',
    label: 'Memorama',
    description: 'Juego de memoria con pares de tarjetas',
  },
  {
    id: 'youtube',
    label: 'Videos de YouTube',
    description: 'Recomendaciones de videos educativos',
  },
]

export function MaterialGenerator({ lessonPlanId, onClose, onSuccess }: MaterialGeneratorProps) {
  const [selectedTypes, setSelectedTypes] = useState<MaterialType[]>([])
  const [generating, setGenerating] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const handleToggle = (type: MaterialType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) return

    setGenerating(true)
    setError(null)
    setProgress({ current: 0, total: selectedTypes.length })

    try {
      // Simulate progress updates
      for (let i = 0; i < selectedTypes.length; i++) {
        const type = selectedTypes[i]
        setCurrentPhase(getPhaseMessage(type))
        setProgress({ current: i + 1, total: selectedTypes.length })

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const response = await fetch('/api/materials/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_plan_id: lessonPlanId,
          material_types: selectedTypes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate materials')
      }

      setSuccess(true)
      setCurrentPhase('¡Listo! Tus materiales están listos')

      // Wait a moment before closing
      await new Promise((resolve) => setTimeout(resolve, 1500))
      onSuccess()
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Error al generar materiales')
    } finally {
      setGenerating(false)
    }
  }

  const getPhaseMessage = (type: MaterialType): string => {
    switch (type) {
      case 'flashcards':
        return 'Creando tus flashcards...'
      case 'worksheets':
        return 'Creando tus worksheets...'
      case 'games':
        return 'Preparando tu memorama...'
      case 'youtube':
        return 'Buscando videos para ti...'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Crear Materiales</h2>
            <p className="mt-1 text-sm text-gray-600">
              Selecciona qué materiales quieres crear para esta clase
            </p>
          </div>
          {!generating && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {!generating && !success && (
          <>
            <div className="space-y-3 mb-6">
              {MATERIAL_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className="flex items-start space-x-3 cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={selectedTypes.includes(option.id)}
                    onCheckedChange={() => handleToggle(option.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {error && (
              <div className="mb-4 flex items-start space-x-2 rounded-lg bg-red-50 p-3 text-red-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={selectedTypes.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Crear materiales ({selectedTypes.length})
              </Button>
            </div>
          </>
        )}

        {generating && (
          <div className="py-8">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="font-medium text-gray-900">{currentPhase}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {progress.current} de {progress.total} materiales
                </p>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">{currentPhase}</p>
                <p className="mt-1 text-sm text-gray-600">Los materiales están listos para usar</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
