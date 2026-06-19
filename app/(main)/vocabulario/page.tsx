'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Plus,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type VocabularyItem = {
  id: string
  word: string
  letter: string
  color: string
  teacher_id: string | null
}

type ExtractedItem = {
  word: string
  letter: string
  color: string
}

export default function VocabularioPage() {
  const router = useRouter()
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [wordUsageMap, setWordUsageMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'list' | 'add' | 'bulk' | 'extract'>('list')
  const [newWord, setNewWord] = useState('')
  const [newLetter, setNewLetter] = useState('A')
  const [newColor, setNewColor] = useState<string>('blue')
  const [bulkText, setBulkText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWord, setEditWord] = useState('')
  const [editLetter, setEditLetter] = useState('A')
  const [editColor, setEditColor] = useState('blue')

  const colors = [
    {
      value: 'red',
      label: 'Rojo',
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
    },
    {
      value: 'blue',
      label: 'Azul',
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300',
    },
    {
      value: 'green',
      label: 'Verde',
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
    },
    {
      value: 'yellow',
      label: 'Amarillo',
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
    },
    {
      value: 'purple',
      label: 'Morado',
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-300',
    },
    {
      value: 'pink',
      label: 'Rosa',
      bg: 'bg-pink-100',
      text: 'text-pink-700',
      border: 'border-pink-300',
    },
    {
      value: 'orange',
      label: 'Naranja',
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-300',
    },
  ]

  useEffect(() => {
    loadVocabulary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadVocabulary() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const [vocabResp, plansResp] = await Promise.all([
        fetch('/api/vocabulary'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('lesson_plans').select('vocabulary'),
      ])

      const vocabData = await vocabResp.json()
      if (vocabData.vocabulary) {
        setVocabulary(vocabData.vocabulary)
      }

      // Build word → plan count map
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plans = (plansResp.data ?? []) as Array<{ vocabulary: string[] }>
      const usageMap: Record<string, number> = {}
      for (const plan of plans) {
        for (const word of plan.vocabulary ?? []) {
          usageMap[word.toLowerCase()] = (usageMap[word.toLowerCase()] ?? 0) + 1
        }
      }
      setWordUsageMap(usageMap)
    } catch (error) {
      console.error('Load error:', error)
      toast.error('No pude cargar el vocabulario')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddWord() {
    if (!newWord.trim()) {
      toast.error('Escribe una palabra')
      return
    }

    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: newWord.trim(),
          letter: newLetter,
          color: newColor,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add word')
      }

      toast.success('Palabra agregada')
      setNewWord('')
      setMode('list')
      loadVocabulary()
    } catch (error) {
      console.error('Add error:', error)
      toast.error('No pude agregar la palabra')
    }
  }

  async function handleBulkImport() {
    if (!bulkText.trim()) {
      toast.error('Escribe o pega el texto con vocabulario')
      return
    }

    setExtracting(true)
    try {
      const response = await fetch('/api/vocabulary/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bulkText }),
      })

      const data = await response.json()

      if (data.items && data.items.length > 0) {
        setExtractedItems(data.items)
        toast.success(`Encontré ${data.items.length} palabras`)
      } else {
        toast.error('No encontré vocabulario en el texto')
      }
    } catch (error) {
      console.error('Extract error:', error)
      toast.error('No pude extraer vocabulario')
    } finally {
      setExtracting(false)
    }
  }

  async function handleImageExtract() {
    if (!selectedFile) {
      toast.error('Selecciona una imagen')
      return
    }

    setExtracting(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        const base64Data = base64.split(',')[1]

        const response = await fetch('/api/vocabulary/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            imageMimeType: selectedFile.type,
          }),
        })

        const data = await response.json()

        if (data.items && data.items.length > 0) {
          setExtractedItems(data.items)
          toast.success(`Encontré ${data.items.length} palabras`)
        } else {
          toast.error('No encontré vocabulario en la imagen')
        }

        setExtracting(false)
      }

      reader.readAsDataURL(selectedFile)
    } catch (error) {
      console.error('Extract error:', error)
      toast.error('No pude extraer vocabulario')
      setExtracting(false)
    }
  }

  async function handleSaveExtracted() {
    if (extractedItems.length === 0) return

    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: extractedItems }),
      })

      const data = await response.json()

      toast.success(`${data.count} palabras guardadas`)
      setExtractedItems([])
      setBulkText('')
      setSelectedFile(null)
      setMode('list')
      loadVocabulary()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('No pude guardar el vocabulario')
    }
  }

  function startEdit(item: VocabularyItem) {
    setEditingId(item.id)
    setEditWord(item.word)
    setEditLetter(item.letter)
    setEditColor(item.color)
  }

  async function handleSaveEdit(id: string) {
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, word: editWord, letter: editLetter, color: editColor }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success('Palabra actualizada')
      setEditingId(null)
      loadVocabulary()
    } catch {
      toast.error('No pude actualizar la palabra')
    }
  }

  async function handleDelete(id: string) {
    // Optimistic removal
    setVocabulary((prev) => prev.filter((v) => v.id !== id))
    try {
      const response = await fetch(`/api/vocabulary?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success('Palabra eliminada')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('No pude eliminar la palabra')
      loadVocabulary() // restore on failure
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface rounded w-1/3"></div>
            <div className="h-64 bg-surface rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const groupedVocabulary = vocabulary.reduce(
    (acc, item) => {
      if (!acc[item.letter]) acc[item.letter] = []
      acc[item.letter].push(item)
      return acc
    },
    {} as Record<string, VocabularyItem[]>
  )

  return (
    <div className="min-h-screen bg-bg p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Mi Vocabulario</h1>
              <p className="text-sm text-text-secondary mt-1">
                {vocabulary.length} palabras en total
              </p>
            </div>
          </div>

          {mode === 'list' && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setMode('add')} variant="outline" size="sm">
                <Plus size={16} className="mr-2" />
                Agregar palabra
              </Button>
              <Button onClick={() => setMode('bulk')} variant="outline" size="sm">
                <FileText size={16} className="mr-2" />
                Importar texto
              </Button>
              <Button onClick={() => setMode('extract')} size="sm">
                <Upload size={16} className="mr-2" />
                Subir imagen
              </Button>
            </div>
          )}
        </div>

        {/* Add Single Word */}
        {mode === 'add' && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Agregar palabra</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Palabra (en inglés)
                </label>
                <Input
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="apple"
                  className="max-w-md"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">Letra</label>
                <select
                  value={newLetter}
                  onChange={(e) => setNewLetter(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-surface text-text-primary max-w-md w-full"
                >
                  {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">Color</label>
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewColor(color.value)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        newColor === color.value
                          ? `${color.bg} ${color.text} ${color.border}`
                          : 'bg-surface text-text-secondary border-border hover:border-border-hover'
                      }`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddWord}>Agregar</Button>
                <Button variant="outline" onClick={() => setMode('list')}>
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Bulk Text Import */}
        {mode === 'bulk' && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Importar desde texto</h2>
            <p className="text-sm text-text-secondary mb-4">
              Pega tu lista de vocabulario (puede ser de notas, documentos, markdown, etc.). Claude
              extraerá las palabras automáticamente.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="A: apple, ant, airplane&#10;B: ball, book, bird&#10;..."
              className="w-full h-64 border border-border rounded-lg px-4 py-3 text-sm bg-surface text-text-primary resize-none"
            />

            {extractedItems.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  {extractedItems.length} palabras encontradas:
                </p>
                <div className="flex flex-wrap gap-2">
                  {extractedItems.slice(0, 20).map((item, i) => {
                    const colorConfig = colors.find((c) => c.value === item.color)
                    return (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${colorConfig?.bg} ${colorConfig?.text} border ${colorConfig?.border}`}
                      >
                        {item.word}
                      </span>
                    )
                  })}
                  {extractedItems.length > 20 && (
                    <span className="text-xs text-text-secondary">
                      +{extractedItems.length - 20} más
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {extractedItems.length === 0 ? (
                <>
                  <Button onClick={handleBulkImport} disabled={extracting}>
                    {extracting ? 'Extrayendo...' : 'Extraer vocabulario'}
                  </Button>
                  <Button variant="outline" onClick={() => setMode('list')}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleSaveExtracted}>
                    Guardar {extractedItems.length} palabras
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExtractedItems([])
                      setBulkText('')
                    }}
                  >
                    Limpiar
                  </Button>
                  <Button variant="outline" onClick={() => setMode('list')}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Image Upload */}
        {mode === 'extract' && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Extraer desde imagen</h2>
            <p className="text-sm text-text-secondary mb-4">
              Sube una foto de tu libro, notas escritas a mano, o cualquier documento. Claude Vision
              extraerá el vocabulario automáticamente.
            </p>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  // Validate file type
                  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
                  if (!validTypes.includes(file.type)) {
                    toast.error('Tipo de archivo no válido. Solo PNG, JPG y WEBP.')
                    return
                  }

                  // Validate file size (5MB max)
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error('Archivo demasiado grande. El tamaño máximo es 5MB.')
                    return
                  }

                  setSelectedFile(file)
                }}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <ImageIcon size={48} className="text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedFile ? selectedFile.name : 'Haz clic para seleccionar una imagen'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">PNG, JPG, WEBP hasta 5MB</p>
                </div>
              </label>
            </div>

            {extractedItems.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  {extractedItems.length} palabras encontradas:
                </p>
                <div className="flex flex-wrap gap-2">
                  {extractedItems.slice(0, 20).map((item, i) => {
                    const colorConfig = colors.find((c) => c.value === item.color)
                    return (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${colorConfig?.bg} ${colorConfig?.text} border ${colorConfig?.border}`}
                      >
                        {item.word}
                      </span>
                    )
                  })}
                  {extractedItems.length > 20 && (
                    <span className="text-xs text-text-secondary">
                      +{extractedItems.length - 20} más
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {extractedItems.length === 0 ? (
                <>
                  <Button onClick={handleImageExtract} disabled={!selectedFile || extracting}>
                    {extracting ? 'Extrayendo...' : 'Extraer vocabulario'}
                  </Button>
                  <Button variant="outline" onClick={() => setMode('list')}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleSaveExtracted}>
                    Guardar {extractedItems.length} palabras
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExtractedItems([])
                      setSelectedFile(null)
                    }}
                  >
                    Limpiar
                  </Button>
                  <Button variant="outline" onClick={() => setMode('list')}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Vocabulary List */}
        {mode === 'list' && (
          <div className="space-y-6">
            {Object.keys(groupedVocabulary)
              .sort()
              .map((letter) => {
                const words = groupedVocabulary[letter]
                return (
                  <Card key={letter} className="p-6">
                    <h3 className="text-xl font-bold text-text-primary mb-4">Letra {letter}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {words.map((item) => {
                        const colorConfig = colors.find((c) => c.value === item.color)
                        const usageCount = wordUsageMap[item.word.toLowerCase()] ?? 0
                        const isEditing = editingId === item.id

                        if (isEditing) {
                          return (
                            <div
                              key={item.id}
                              className="p-3 rounded-lg border-2 border-primary bg-surface flex flex-col gap-2"
                            >
                              <Input
                                value={editWord}
                                onChange={(e) => setEditWord(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <select
                                  value={editLetter}
                                  onChange={(e) => setEditLetter(e.target.value)}
                                  className="flex-1 text-xs border rounded px-1 py-0.5 bg-background"
                                >
                                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
                                    <option key={l} value={l}>
                                      {l}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={editColor}
                                  onChange={(e) => setEditColor(e.target.value)}
                                  className="flex-1 text-xs border rounded px-1 py-0.5 bg-background"
                                >
                                  {colors.map((c) => (
                                    <option key={c.value} value={c.value}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-text-secondary hover:text-text-primary"
                                >
                                  <X size={14} />
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <Check size={14} />
                                </button>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border-2 flex flex-col gap-1 ${colorConfig?.bg} ${colorConfig?.border}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${colorConfig?.text}`}>
                                {item.word}
                              </span>
                              <div className="flex gap-1">
                                {item.teacher_id && (
                                  <button
                                    onClick={() => startEdit(item)}
                                    className="text-text-secondary hover:text-primary transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="text-text-secondary hover:text-red-600 transition-colors"
                                  aria-label="Eliminar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <span
                              className={`text-xs ${usageCount > 0 ? colorConfig?.text : 'text-text-secondary'} opacity-75`}
                            >
                              {usageCount > 0
                                ? `En ${usageCount} plan${usageCount === 1 ? '' : 'es'}`
                                : 'Sin usar'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )
              })}

            {vocabulary.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-text-secondary mb-4">No tienes vocabulario todavía</p>
                <Button onClick={() => setMode('add')}>
                  <Plus size={16} className="mr-2" />
                  Agregar tu primera palabra
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
