'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Card } from '@/components/ui/card'
import {
  Package,
  Loader2,
  Layers,
  FileText,
  Gamepad2,
  PlayCircle,
  Grid3X3,
  Search,
  AlignLeft,
  Shuffle,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Circle,
  Share2,
  CheckSquare,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// material type → school resource_type (mirrors the detail page's share-to-school mapping).
const RESOURCE_TYPE_MAP: Record<string, string> = {
  flashcards: 'flashcard',
  memory_game: 'game',
  bingo: 'game',
  matching: 'game',
  picture_word_match: 'game',
  sorting_game: 'game',
  word_search: 'worksheet',
  song_worksheet: 'worksheet',
  letter_recognition: 'worksheet',
  worksheets: 'worksheet',
  worksheet: 'worksheet',
}

type Material = {
  id: string
  type: string
  created_at: string
  lesson_plan_id: string | null
  fortnight_id: string | null
}

const TYPE_LABELS: Record<string, string> = {
  flashcards: 'Flashcards',
  memory_game: 'Memorama',
  bingo: 'Bingo',
  word_search: 'Sopa de Letras',
  song_worksheet: 'Hoja de Canción',
  letter_recognition: 'Reconoc. Letras',
  matching: 'Matching',
  youtube: 'Videos YouTube',
  worksheet: 'Hoja de Trabajo',
  worksheets: 'Hoja de Trabajo',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  flashcards: Layers,
  memory_game: Gamepad2,
  bingo: Grid3X3,
  word_search: Search,
  song_worksheet: AlignLeft,
  letter_recognition: FileText,
  matching: Shuffle,
  youtube: PlayCircle,
  worksheet: FileText,
  worksheets: FileText,
}

const TYPE_COLORS: Record<string, string> = {
  flashcards: 'bg-blue-50 text-blue-700 border-blue-200',
  memory_game: 'bg-green-50 text-green-700 border-green-200',
  bingo: 'bg-purple-50 text-purple-700 border-purple-200',
  word_search: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  song_worksheet: 'bg-pink-50 text-pink-700 border-pink-200',
  letter_recognition: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  matching: 'bg-orange-50 text-orange-700 border-orange-200',
  youtube: 'bg-red-50 text-red-700 border-red-200',
  worksheet: 'bg-gray-50 text-gray-700 border-gray-200',
  worksheets: 'bg-gray-50 text-gray-700 border-gray-200',
}

function groupByDate(materials: Material[]): Record<string, Material[]> {
  const groups: Record<string, Material[]> = {}
  for (const m of materials) {
    const date = new Date(m.created_at).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    groups[date] ??= []
    groups[date].push(m)
  }
  return groups
}

const CREATABLE_TYPES = [
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'games', label: 'Memorama' },
  { key: 'worksheets', label: 'Hoja de trabajo' },
  { key: 'matching', label: 'Matching' },
  { key: 'picture_word_match', label: 'Imagen-Palabra' },
]

export default function MaterialesPage() {
  const router = useRouter()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [allVocab, setAllVocab] = useState<{ id: string; word: string }[]>([])
  const [selectedVocab, setSelectedVocab] = useState<string[]>([])
  const [manualWord, setManualWord] = useState('')
  const [topic, setTopic] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['flashcards'])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()
      if (!teacher) {
        router.push('/onboarding')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('materials')
        // The column is generated_at; alias it to created_at so the rest of the page is unchanged.
        // (Selecting a non-existent created_at returned PostgREST 42703 → 400 → empty list.)
        .select('id, type, created_at:generated_at, lesson_plan_id, fortnight_id')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('teacher_id', (teacher as any).id)
        .order('generated_at', { ascending: false })

      setMaterials(data ?? [])
      setLoading(false)
    }
    load()
    fetch('/api/vocabulary')
      .then((r) => r.json())
      .then((d) => setAllVocab(d.items ?? []))
      .catch((err) => console.error('Failed to load vocabulary:', err))
  }, [router])

  async function handleCreate() {
    const vocab = selectedVocab.length > 0 ? selectedVocab : undefined
    if (!vocab) return alert('Selecciona al menos una palabra')
    if (selectedTypes.length === 0) return alert('Selecciona al menos un tipo')
    setCreating(true)
    try {
      const res = await fetch('/api/materials/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabulary: vocab,
          topic: topic || undefined,
          material_types: selectedTypes,
        }),
      })
      if (!res.ok) throw new Error()
      const { material_ids } = await res.json()
      // Navigate to the first created material
      if (material_ids?.length) router.push(`/materiales/${material_ids[0]}`)
    } catch {
      alert('Error al crear el material. Intenta de nuevo.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('¿Eliminar este material?')) return
    const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    if (res.ok) setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  async function handleBatchDelete() {
    const ids = Array.from(selected)
    if (ids.length === 0 || !confirm(`¿Eliminar ${ids.length} material(es)?`)) return
    setBatchBusy(true)
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/materials/${id}`, { method: 'DELETE' }))
    )
    const okIds = ids.filter(
      (_, i) =>
        results[i].status === 'fulfilled' &&
        (results[i] as PromiseFulfilledResult<Response>).value.ok
    )
    setMaterials((prev) => prev.filter((m) => !okIds.includes(m.id)))
    setBatchBusy(false)
    exitSelectMode()
    if (okIds.length < ids.length) toast.error(`No pude eliminar ${ids.length - okIds.length}`)
    else toast.success(`${okIds.length} eliminado(s)`)
  }

  async function handleBatchShare() {
    const sel = materials.filter((m) => selected.has(m.id))
    if (sel.length === 0) return
    setBatchBusy(true)
    const results = await Promise.allSettled(
      sel.map((m) =>
        fetch('/api/school/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: TYPE_LABELS[m.type] ?? m.type,
            file_url: `${window.location.origin}/materiales/${m.id}`,
            resource_type: RESOURCE_TYPE_MAP[m.type] ?? 'other',
          }),
        })
      )
    )
    const ok = results.filter(
      (r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<Response>).value.ok
    ).length
    setBatchBusy(false)
    exitSelectMode()
    if (ok === sel.length) toast.success(`${ok} compartido(s) con la escuela`)
    else toast.error(`Compartí ${ok} de ${sel.length}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const groups = groupByDate(materials)
  const dates = Object.keys(groups)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mis Materiales</h1>
          <p className="text-sm text-gray-600 mt-1">Todos los materiales que has creado</p>
        </div>
        <div className="flex gap-2">
          {materials.length > 0 && (
            <Button
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              variant="outline"
              className="min-h-[44px]"
            >
              {selectMode ? (
                <X size={16} className="mr-2" />
              ) : (
                <CheckSquare size={16} className="mr-2" />
              )}
              {selectMode ? 'Cancelar' : 'Seleccionar'}
            </Button>
          )}
          <Button
            onClick={() => setShowCreate((v) => !v)}
            variant={showCreate ? 'outline' : 'default'}
            className="min-h-[44px]"
          >
            {showCreate ? <X size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
            {showCreate ? 'Cancelar' : 'Crear material'}
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-900">Nuevo material</h2>

          {/* Vocab selection */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Vocabulario</p>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto mb-2">
              {allVocab.map((v) => {
                const sel = selectedVocab.includes(v.word)
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      setSelectedVocab((p) =>
                        sel ? p.filter((w) => w !== v.word) : [...p, v.word]
                      )
                    }
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${sel ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}
                  >
                    {v.word}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={manualWord}
                onChange={(e) => setManualWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualWord.trim()) {
                    e.preventDefault()
                    setSelectedVocab((p) =>
                      p.includes(manualWord.trim()) ? p : [...p, manualWord.trim()]
                    )
                    setManualWord('')
                  }
                }}
                placeholder="Agregar palabra manual y presionar Enter"
                className="h-9 text-sm"
              />
            </div>
            {selectedVocab.length > 0 && (
              <p className="text-xs text-primary mt-1">
                {selectedVocab.length} palabra{selectedVocab.length !== 1 ? 's' : ''} seleccionada
                {selectedVocab.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Topic */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Tema <span className="font-normal text-gray-500">(opcional)</span>
            </p>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: Los animales de la granja"
              className="h-9 text-sm"
            />
          </div>

          {/* Type selection */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Tipo de material</p>
            <div className="flex flex-wrap gap-2">
              {CREATABLE_TYPES.map((t) => {
                const sel = selectedTypes.includes(t.key)
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() =>
                      setSelectedTypes((p) => (sel ? p.filter((k) => k !== t.key) : [...p, t.key]))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-colors ${sel ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating || selectedVocab.length === 0}
            className="w-full min-h-[44px]"
          >
            {creating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear material'
            )}
          </Button>
        </div>
      )}

      {materials.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Aún no has creado materiales</h2>
          <p className="text-sm text-gray-600">
            Ve a una planeación y usa el botón <strong>&ldquo;Crear materiales&rdquo;</strong> para
            generar flashcards, bingo, sopas de letras y más.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {dates.map((date) => (
            <div key={date}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {date}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {groups[date].map((m) => {
                  const Icon = TYPE_ICONS[m.type] ?? Package
                  const colorClass =
                    TYPE_COLORS[m.type] ?? 'bg-gray-50 text-gray-700 border-gray-200'
                  const label = TYPE_LABELS[m.type] ?? m.type
                  const isSel = selected.has(m.id)
                  const body = (
                    <Card
                      className={`p-4 border transition-shadow ${colorClass} ${
                        selectMode ? '' : 'cursor-pointer hover:shadow-md'
                      } ${isSel ? 'ring-2 ring-primary' : ''}`}
                    >
                      <Icon className="h-6 w-6 mb-2" />
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs opacity-70 mt-0.5">
                        {new Date(m.created_at).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </Card>
                  )
                  // Select mode: clicking toggles selection. Normal mode: navigate to detail.
                  return selectMode ? (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleSelect(m.id)}
                      className="relative text-left"
                    >
                      <span className="absolute top-1.5 left-1.5 z-10">
                        {isSel ? (
                          <CheckCircle2 size={18} className="text-primary fill-white" />
                        ) : (
                          <Circle size={18} className="text-gray-400" />
                        )}
                      </span>
                      {body}
                    </button>
                  ) : (
                    <Link key={m.id} href={`/materiales/${m.id}`} className="relative group">
                      {body}
                      <button
                        onClick={(e) => handleDelete(e, m.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-600"
                        aria-label="Eliminar material"
                      >
                        <Trash2 size={13} />
                      </button>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch action bar — appears while selecting */}
      {selectMode && selected.size > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-lg">
          <span className="text-sm font-medium text-text-primary">
            {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set(materials.map((m) => m.id)))}
          >
            Seleccionar todo
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" disabled={batchBusy} onClick={handleBatchShare}>
            <Share2 size={15} className="mr-1.5" /> Compartir
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={batchBusy}
            onClick={handleBatchDelete}
            className="text-red-600 hover:text-red-700"
          >
            {batchBusy ? (
              <Loader2 size={15} className="mr-1.5 animate-spin" />
            ) : (
              <Trash2 size={15} className="mr-1.5" />
            )}{' '}
            Eliminar
          </Button>
        </div>
      )}
    </div>
  )
}
