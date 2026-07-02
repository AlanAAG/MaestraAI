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
  ChevronDown,
  BookOpen,
  PencilLine,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { progressToast } from '@/lib/ui/progress-toast'
import { extractVocabImagesFromDocx, type ExtractedVocabImage } from '@/lib/vocab/docx-images'

type VocabularyItem = {
  id: string
  word: string
  letter: string
  color: string
  teacher_id: string | null
  image_url?: string | null
}

type ExtractedItem = {
  word: string
  letter: string
  color: string
}

type RichmondUnitCatalog = {
  id: string
  unit_number: number
  unit_title: string
  groups: { id: string; lesson_range: string; sort_order: number; vocabulary: string[] }[]
}

export default function VocabularioPage() {
  const router = useRouter()
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [richmondCatalog, setRichmondCatalog] = useState<RichmondUnitCatalog[]>([])
  const [vocabTab, setVocabTab] = useState<'richmond' | 'maestra'>('richmond')
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [wordUsageMap, setWordUsageMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'list' | 'add' | 'bulk' | 'extract' | 'docximg'>('list')
  // Bulk image import from a flashcard .docx (parsed client-side).
  const [docxImages, setDocxImages] = useState<ExtractedVocabImage[]>([])
  const [parsingDocx, setParsingDocx] = useState(false)
  const [importingImgs, setImportingImgs] = useState(false)
  const [imgProgress, setImgProgress] = useState({ done: 0, total: 0 })
  // "Solo imágenes": only attach to words the teacher already has (never create new ones).
  const [existingOnly, setExistingOnly] = useState(false)
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

      // Richmond teachers also see the book catalog vocabulary, grouped by unit/lesson
      // (read-only, public-read RLS — never merged into the letter bank).
      if (vocabData.editorial === 'richmond') {
        type Row = {
          id: string
          unit_number: number
          unit_title: string
          richmond_lesson_groups: RichmondUnitCatalog['groups'] | null
        }
        // richmond_* tables aren't in the generated DB types; cast through the codebase's pattern.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('richmond_units')
          .select(
            'id, unit_number, unit_title, richmond_lesson_groups(id, lesson_range, sort_order, vocabulary)'
          )
          .eq('book_code', 'TG5A')
          .order('unit_number', { ascending: true })
        const units = data as Row[] | null
        if (Array.isArray(units)) {
          const catalog = units.map((u) => ({
            id: u.id,
            unit_number: u.unit_number,
            unit_title: u.unit_title,
            groups: [...(u.richmond_lesson_groups ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order
            ),
          }))
          setRichmondCatalog(catalog)
          // Expand the first unit by default so the tab isn't a wall of collapsed rows.
          const firstWithWords = catalog.find((u) => u.groups.some((g) => g.vocabulary?.length))
          if (firstWithWords) setExpandedUnits(new Set([firstWithWords.id]))
        }
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
    const p = progressToast(['Leyendo tu lista…', 'Identificando las palabras…'])
    try {
      const response = await fetch('/api/vocabulary/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bulkText }),
      })

      const data = await response.json()

      if (data.items && data.items.length > 0) {
        setExtractedItems(data.items)
        p.success(`Encontré ${data.items.length} palabras`)
      } else {
        p.error(data.error ?? 'No encontré vocabulario en el texto')
      }
    } catch (error) {
      console.error('Extract error:', error)
      p.error('No pude extraer vocabulario')
    } finally {
      setExtracting(false)
    }
  }

  async function handleImageExtract() {
    if (!selectedFile) {
      toast.error('Selecciona un archivo')
      return
    }

    // Flashcard .docx with embedded images → import the words AND their pictures together
    // (client-side). Only falls back to text extraction if the doc has no usable images.
    const isDocx =
      selectedFile.name.toLowerCase().endsWith('.docx') ||
      selectedFile.type.includes('wordprocessingml')
    if (isDocx) {
      setExtracting(true)
      let imgs: ExtractedVocabImage[] = []
      try {
        imgs = await extractVocabImagesFromDocx(selectedFile)
      } catch {
        /* not a flashcard-style doc → fall through to text extraction */
      }
      if (imgs.length > 0) {
        setDocxImages(imgs)
        setSelectedFile(null)
        setExtracting(false)
        setMode('docximg')
        return
      }
      setExtracting(false)
      // No images found. The text-extraction API can't take a big file (server body limit) —
      // don't attempt a doomed upload; tell the teacher instead.
      if (selectedFile.size > 4 * 1024 * 1024) {
        toast.error(
          'No encontré imágenes en el documento y es muy grande para leer el texto. Revisa que sea el documento de flashcards (una palabra con su imagen).'
        )
        return
      }
    }

    setExtracting(true)
    const p = progressToast([
      'Leyendo el archivo…',
      'Extrayendo el vocabulario…',
      'Identificando las palabras (puede tardar un poco)…',
    ])
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string
          const base64Data = base64.split(',')[1]

          const isImage = selectedFile.type.startsWith('image/')
          const response = await fetch('/api/vocabulary/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              isImage
                ? { imageBase64: base64Data, imageMimeType: selectedFile.type }
                : { documentBase64: base64Data, documentMimeType: selectedFile.type }
            ),
          })

          const data = await response.json()

          if (data.items && data.items.length > 0) {
            setExtractedItems(data.items)
            p.success(`Encontré ${data.items.length} palabras`)
          } else {
            p.error(data.error ?? 'No encontré vocabulario en el archivo')
          }
        } catch {
          p.error('No pude extraer vocabulario')
        } finally {
          setExtracting(false)
        }
      }

      reader.readAsDataURL(selectedFile)
    } catch (error) {
      console.error('Extract error:', error)
      p.error('No pude extraer vocabulario')
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
      if (!response.ok) {
        toast.error(data.error ?? 'No pude guardar el vocabulario')
        return // keep the extracted list so nothing is lost
      }

      const saved = data.count ?? extractedItems.length
      // ignoreDuplicates upsert returns 0 rows when everything was already saved.
      toast.success(
        saved === 0
          ? 'Ya estaban guardadas (0 nuevas)'
          : `${saved} ${saved === 1 ? 'palabra guardada' : 'palabras guardadas'}`
      )
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

  // Upload a teacher photo for one word → used as the picture in flashcards/games.
  async function uploadImage(itemId: string, file: File) {
    setUploadingId(itemId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('word_id', itemId)
      const res = await fetch('/api/vocabulary/image', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error)
      toast.success('Imagen guardada')
      loadVocabulary()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo subir la imagen')
    } finally {
      setUploadingId(null)
    }
  }

  // Parse a flashcard .docx entirely in the browser → word↔thumbnail pairs for preview.
  async function handleDocxSelect(file: File) {
    setParsingDocx(true)
    setDocxImages([])
    try {
      const items = await extractVocabImagesFromDocx(file)
      if (items.length === 0) {
        toast.error('No encontré imágenes con palabra en el documento.')
      } else {
        setDocxImages(items)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo leer el documento.')
    } finally {
      setParsingDocx(false)
    }
  }

  // Upload each parsed thumbnail. Default: find-or-create the word. "Solo imágenes" (existingOnly):
  // upload only for words already in the teacher's vocabulary — never creates a new word.
  async function handleImportImages() {
    const existing = new Set(vocabulary.map((v) => v.word.toLowerCase().trim()))
    const toUpload = existingOnly ? docxImages.filter((it) => existing.has(it.word)) : docxImages
    if (toUpload.length === 0) {
      toast.error('Ninguna imagen coincide con tus palabras existentes.')
      return
    }
    setImportingImgs(true)
    setImgProgress({ done: 0, total: toUpload.length })
    let ok = 0
    for (let i = 0; i < toUpload.length; i++) {
      const it = toUpload[i]
      try {
        const fd = new FormData()
        fd.append('file', new File([it.blob], `${it.word}.jpg`, { type: 'image/jpeg' }))
        fd.append('word', it.word)
        const res = await fetch('/api/vocabulary/image', { method: 'POST', body: fd })
        if (res.ok) ok++
      } catch {
        /* skip failed word, keep going */
      }
      setImgProgress({ done: i + 1, total: toUpload.length })
    }
    setImportingImgs(false)
    toast.success(`${ok} imágenes guardadas`)
    docxImages.forEach((it) => URL.revokeObjectURL(it.previewUrl))
    setDocxImages([])
    setMode('list')
    loadVocabulary()
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

  const richmondWordCount = richmondCatalog.reduce(
    (n, u) => n + u.groups.reduce((m, g) => m + (g.vocabulary?.length ?? 0), 0),
    0
  )
  const toggleUnit = (id: string) =>
    setExpandedUnits((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

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
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
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
                Subir archivo
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
              Pega tu lista de vocabulario (puede ser de notas, documentos, markdown, etc.).
              MaestraIA extraerá las palabras automáticamente.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Pega tu lista. Funciona con:&#10;A&#10;apple&#10;ant&#10;&#10;B&#10;ball&#10;...&#10;o también: A: apple, ant"
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
            <h2 className="text-lg font-semibold text-text-primary mb-4">Subir vocabulario</h2>
            <p className="text-sm text-text-secondary mb-4">
              Sube una foto, un PDF o un Word (.docx) con tu vocabulario. Extraemos las palabras
              automáticamente (con OCR). Si tu documento de Word trae{' '}
              <strong>una imagen por palabra</strong> (como el de flashcards), guardamos las
              palabras <strong>y sus imágenes</strong> de una vez.
            </p>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  const validTypes = [
                    'image/png',
                    'image/jpeg',
                    'image/jpg',
                    'image/webp',
                    'application/pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/msword',
                  ]
                  if (!validTypes.includes(file.type)) {
                    toast.error('Tipo no válido. Usa PNG, JPG, WEBP, PDF o Word (.docx).')
                    return
                  }

                  // A flashcard .docx is parsed in the browser (never uploaded), so it can be big
                  // (Alejandra's is ~23 MB). Images/PDFs still go to the server → keep them smaller.
                  const isDocx =
                    file.name.toLowerCase().endsWith('.docx') ||
                    file.type.includes('wordprocessingml')
                  const maxMb = isDocx ? 60 : 10
                  if (file.size > maxMb * 1024 * 1024) {
                    toast.error(`Archivo demasiado grande. El tamaño máximo es ${maxMb}MB.`)
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
                    {selectedFile ? selectedFile.name : 'Haz clic para seleccionar un archivo'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Imagen o PDF hasta 10MB · Word (.docx) hasta 60MB
                  </p>
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

        {/* Bulk image import from a flashcard .docx (parsed + resized in the browser) */}
        {mode === 'docximg' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Importar imágenes desde documento
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Sube un documento de Word (.docx) con una palabra y su imagen (como el de flashcards).
              Tomamos la imagen de cada palabra y la asociamos automáticamente. El documento se
              procesa aquí en tu navegador — solo se guardan miniaturas pequeñas.
            </p>

            {docxImages.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                  {parsingDocx ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  {parsingDocx ? 'Leyendo documento…' : 'Elegir documento .docx'}
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    disabled={parsingDocx}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleDocxSelect(f)
                      e.target.value = ''
                    }}
                  />
                </label>
                <Button variant="outline" size="sm" onClick={() => setMode('list')}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-text-primary">
                      {docxImages.length} imágenes encontradas
                    </p>
                    {!importingImgs && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          docxImages.forEach((it) => URL.revokeObjectURL(it.previewUrl))
                          setDocxImages([])
                        }}
                      >
                        Elegir otro
                      </Button>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={existingOnly}
                      onChange={(e) => setExistingOnly(e.target.checked)}
                      disabled={importingImgs}
                      className="h-4 w-4 accent-primary"
                    />
                    Solo agregar imágenes a mis palabras existentes (no crear palabras nuevas)
                  </label>
                  {(() => {
                    const existing = new Set(vocabulary.map((v) => v.word.toLowerCase().trim()))
                    const matched = docxImages.filter((it) => existing.has(it.word)).length
                    const count = existingOnly ? matched : docxImages.length
                    return (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={handleImportImages}
                          disabled={importingImgs || count === 0}
                          size="sm"
                        >
                          {importingImgs ? (
                            <>
                              <Loader2 size={14} className="mr-2 animate-spin" />
                              Guardando {imgProgress.done}/{imgProgress.total}…
                            </>
                          ) : (
                            `Guardar ${count} ${count === 1 ? 'imagen' : 'imágenes'}`
                          )}
                        </Button>
                        {existingOnly && (
                          <p className="text-xs text-text-secondary">
                            {matched} de {docxImages.length} coinciden con tu vocabulario
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-5">
                  {docxImages.map((it) => (
                    <div
                      key={it.word}
                      className="flex flex-col items-center rounded-lg border border-border p-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.previewUrl}
                        alt={it.word}
                        className="h-16 w-16 rounded object-cover"
                      />
                      <span className="mt-1 truncate text-xs text-text-secondary">{it.word}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Vocabulary List */}
        {mode === 'list' && (
          <div className="space-y-6">
            {/* Tabs — only for Richmond teachers (who have a book catalog) */}
            {richmondCatalog.length > 0 && (
              <div className="inline-flex w-full gap-1 rounded-xl border border-border bg-surface p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setVocabTab('richmond')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
                    vocabTab === 'richmond'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <BookOpen size={16} />
                  Richmond
                  <span
                    className={`rounded-full px-1.5 text-xs ${vocabTab === 'richmond' ? 'bg-white/20' : 'bg-muted'}`}
                  >
                    {richmondWordCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVocabTab('maestra')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
                    vocabTab === 'maestra'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <PencilLine size={16} />
                  Mi vocabulario
                  <span
                    className={`rounded-full px-1.5 text-xs ${vocabTab === 'maestra' ? 'bg-white/20' : 'bg-muted'}`}
                  >
                    {vocabulary.length}
                  </span>
                </button>
              </div>
            )}

            {/* RICHMOND TAB — collapsible unit cards, scannable chips (read-only book catalog) */}
            {richmondCatalog.length > 0 && vocabTab === 'richmond' && (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  Vocabulario de tu libro, por unidad y lección. Solo lectura.
                </p>
                {richmondCatalog
                  .filter((u) => u.groups.some((g) => g.vocabulary?.length))
                  .map((u) => {
                    const open = expandedUnits.has(u.id)
                    const count = u.groups.reduce((n, g) => n + (g.vocabulary?.length ?? 0), 0)
                    return (
                      <Card key={u.id} className="overflow-hidden p-0">
                        <button
                          type="button"
                          onClick={() => toggleUnit(u.id)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40"
                        >
                          <div className="min-w-0">
                            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-primary">
                              Unidad {u.unit_number}
                            </p>
                            <h3 className="truncate text-base font-bold text-text-primary">
                              {u.unit_title}
                            </h3>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">
                              {count} palabras
                            </span>
                            <ChevronDown
                              size={18}
                              className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>
                        {open && (
                          <div className="space-y-4 border-t border-border px-5 pb-5 pt-4">
                            {u.groups
                              .filter((g) => g.vocabulary?.length)
                              .map((g) => (
                                <div key={g.id}>
                                  <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-text-secondary">
                                    Lecciones {g.lesson_range}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {g.vocabulary.map((w, i) => (
                                      <span
                                        key={`${g.id}-${i}`}
                                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-sm text-text-primary"
                                      >
                                        {w}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </Card>
                    )
                  })}
              </div>
            )}

            {/* MI VOCABULARIO TAB — by letter (default view for non-Richmond teachers) */}
            {(richmondCatalog.length === 0 || vocabTab === 'maestra') && (
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
                                  <div className="flex items-center gap-1">
                                    {item.teacher_id && (
                                      <>
                                        {/* Per-word photo (shows in flashcards/games) */}
                                        <label
                                          className="cursor-pointer text-text-secondary hover:text-primary transition-colors"
                                          aria-label="Subir imagen"
                                          title="Subir una foto para esta palabra"
                                        >
                                          {uploadingId === item.id ? (
                                            <Loader2 size={13} className="animate-spin" />
                                          ) : (
                                            <ImageIcon size={13} />
                                          )}
                                          <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            disabled={uploadingId === item.id}
                                            onChange={(e) => {
                                              const f = e.target.files?.[0]
                                              if (f) uploadImage(item.id, f)
                                              e.target.value = ''
                                            }}
                                          />
                                        </label>
                                        <button
                                          onClick={() => startEdit(item)}
                                          className="text-text-secondary hover:text-primary transition-colors"
                                          aria-label="Editar"
                                        >
                                          <Pencil size={13} />
                                        </button>
                                      </>
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
                                {item.image_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.image_url}
                                    alt={item.word}
                                    className="mt-1 h-14 w-14 rounded-md object-cover ring-1 ring-black/5"
                                  />
                                )}
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
        )}
      </div>
    </div>
  )
}
