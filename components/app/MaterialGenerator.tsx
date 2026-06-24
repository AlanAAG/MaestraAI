'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { X, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { DifficultySelector, type Difficulty } from '@/components/app/materials/DifficultySelector'

type LetterActivityType = 'hear_and_circle' | 'match_to_letter' | 'trace_and_say'
const LETTER_ACTIVITY_OPTIONS: { id: LetterActivityType; label: string; sub: string }[] = [
  { id: 'hear_and_circle', label: 'Escuchar', sub: 'encerrar letra' },
  { id: 'match_to_letter', label: 'Unir', sub: 'imagen → letra' },
  { id: 'trace_and_say', label: 'Trazar', sub: 'y decir' },
]

type GenerateMaterialType =
  | 'flashcards'
  | 'worksheets'
  | 'games'
  | 'youtube'
  | 'letter_recognition'
  | 'matching'
  | 'picture_word_match'
  | 'sorting_game'
type SpecialMaterialType = 'bingo' | 'word_search' | 'from_youtube'
type MaterialType = GenerateMaterialType | SpecialMaterialType | 'fortnight_pack'

type MaterialOption = {
  id: MaterialType
  label: string
  eta: string
  disabled?: boolean
  needsUrl?: boolean
  needsCardCount?: boolean
}

const MATERIAL_OPTIONS: MaterialOption[] = [
  { id: 'flashcards', label: 'Flashcards', eta: '~2 min' },
  { id: 'games', label: 'Memorama', eta: '~2 min' },
  { id: 'bingo', label: 'Bingo', eta: '~1 min', needsCardCount: true },
  { id: 'letter_recognition', label: 'Reconoc. Letras', eta: '~2 min' },
  { id: 'matching', label: 'Matching', eta: '~2 min' },
  { id: 'word_search', label: 'Sopa de Letras', eta: '~1 min' },
  { id: 'youtube', label: 'Videos YouTube', eta: '~2 min' },
  { id: 'from_youtube', label: 'Desde YouTube', eta: '~3 min', needsUrl: true },
  { id: 'picture_word_match', label: '¿Cuál es la palabra?', eta: '~2 min' },
  { id: 'sorting_game', label: 'Ordena y clasifica', eta: '~2 min' },
  { id: 'fortnight_pack', label: 'Paquete quincena', eta: 'Pronto', disabled: true },
]

const GENERATE_TYPES: GenerateMaterialType[] = [
  'flashcards',
  'worksheets',
  'games',
  'youtube',
  'letter_recognition',
  'matching',
  'picture_word_match',
  'sorting_game',
]

type MaterialGeneratorProps = {
  // Optional: omitted when creating materials at the fortnight (document) level rather than a day.
  lessonPlanId?: string
  fortnightId: string
  vocabulary?: string[]
  onClose: () => void
  onSuccess: () => void
}

export function MaterialGenerator({
  lessonPlanId,
  fortnightId,
  vocabulary,
  onClose,
  onSuccess,
}: MaterialGeneratorProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<MaterialType>>(new Set())
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [cardCount, setCardCount] = useState(30)
  const [freeSpace, setFreeSpace] = useState(true)
  const [difficulty, setDifficulty] = useState<Difficulty>('kinder')
  const [letterActivityType, setLetterActivityType] =
    useState<LetterActivityType>('hear_and_circle')
  const [generating, setGenerating] = useState(false)
  const [currentPhase, setCurrentPhase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const toggle = (type: MaterialType) => {
    if (MATERIAL_OPTIONS.find((o) => o.id === type)?.disabled) return
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleGenerate = async () => {
    if (selectedTypes.size === 0) return
    if (selectedTypes.has('from_youtube') && !youtubeUrl.trim()) {
      setError('Ingresa una URL de YouTube para continuar')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      // 1. Generate-route types (flashcards, worksheets, games, youtube, letter_recognition, matching)
      const generateTypes = Array.from(selectedTypes).filter((t): t is GenerateMaterialType =>
        GENERATE_TYPES.includes(t as GenerateMaterialType)
      )

      if (generateTypes.length > 0) {
        setCurrentPhase('Creando materiales...')
        const res = await fetch('/api/materials/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lesson_plan_id: lessonPlanId,
            vocabulary: vocabulary?.length ? vocabulary : undefined,
            material_types: generateTypes,
            options: selectedTypes.has('letter_recognition')
              ? { letter_activity_type: letterActivityType }
              : undefined,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Error al generar materiales')
        }
      }

      // 2. Bingo → returns PDF download
      if (selectedTypes.has('bingo')) {
        setCurrentPhase('Generando tarjetas de bingo...')
        const res = await fetch('/api/materials/bingo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fortnight_id: fortnightId,
            lesson_plan_id: lessonPlanId,
            vocabulary: vocabulary?.length ? vocabulary : undefined,
            card_count: cardCount,
            free_space: freeSpace,
            difficulty,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Error al generar bingo')
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bingo-${cardCount}-tarjetas.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }

      // 3. Word search
      if (selectedTypes.has('word_search')) {
        setCurrentPhase('Generando sopa de letras...')
        const res = await fetch('/api/materials/word-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fortnight_id: fortnightId,
            lesson_plan_id: lessonPlanId,
            vocabulary: vocabulary?.length ? vocabulary : undefined,
            difficulty,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Error al generar sopa de letras')
        }
      }

      // 4. From YouTube
      if (selectedTypes.has('from_youtube')) {
        setCurrentPhase('Analizando video de YouTube...')
        const res = await fetch('/api/materials/from-youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: youtubeUrl.trim(),
            fortnight_id: fortnightId,
            lesson_plan_id: lessonPlanId,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Error al procesar el video')
        }
      }

      setSuccess(true)
      setCurrentPhase('¡Listo! Tus materiales están listos')
      await new Promise((r) => setTimeout(r, 1500))
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar materiales')
    } finally {
      setGenerating(false)
    }
  }

  const needsUrl = selectedTypes.has('from_youtube')
  const needsCardConfig = selectedTypes.has('bingo')
  const needsDifficulty = selectedTypes.has('bingo') || selectedTypes.has('word_search')
  const selectedCount = Array.from(selectedTypes).filter((t) => t !== 'fortnight_pack').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Crear Materiales</h2>
            <p className="mt-1 text-sm text-gray-600">
              Selecciona qué materiales crear para esta clase
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
            {/* 3×3 grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {MATERIAL_OPTIONS.map((option) => {
                const checked = selectedTypes.has(option.id)
                return (
                  <label
                    key={option.id}
                    className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                      option.disabled
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : checked
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(option.id)}
                        disabled={option.disabled}
                      />
                      <span className="text-xs text-gray-400">{option.eta}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 leading-tight">
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>

            {/* YouTube URL input */}
            {needsUrl && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL del video de YouTube
                </label>
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="min-h-[44px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo videos públicos con subtítulos disponibles
                </p>
              </div>
            )}

            {/* Difficulty selector (bingo + word search) */}
            {needsDifficulty && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dificultad</label>
                <DifficultySelector value={difficulty} onChange={setDifficulty} />
              </div>
            )}

            {/* Letter recognition activity type */}
            {selectedTypes.has('letter_recognition') && (
              <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                <label className="block text-sm font-medium text-indigo-900 mb-2">
                  Actividad — Reconocimiento de Letras
                </label>
                <div className="flex gap-1.5">
                  {LETTER_ACTIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLetterActivityType(opt.id)}
                      className={`flex-1 text-xs px-2 py-2 rounded-lg border transition-colors text-center ${
                        letterActivityType === opt.id
                          ? 'border-indigo-500 bg-indigo-100 text-indigo-900 font-semibold'
                          : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-indigo-400 text-xs mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bingo config */}
            {needsCardConfig && (
              <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de tarjetas: <strong>{cardCount}</strong>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={35}
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>1</span>
                    <span>35</span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeSpace}
                    onChange={(e) => setFreeSpace(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Casilla FREE en el centro</span>
                </label>
              </div>
            )}

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
                disabled={selectedCount === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Crear materiales ({selectedCount})
              </Button>
            </div>
          </>
        )}

        {generating && (
          <div className="py-8 flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="font-medium text-gray-900">{currentPhase}</p>
          </div>
        )}

        {success && (
          <div className="py-8 flex flex-col items-center space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <p className="font-medium text-gray-900">{currentPhase}</p>
            <p className="text-sm text-gray-600">Los materiales están listos para usar</p>
          </div>
        )}
      </Card>
    </div>
  )
}
