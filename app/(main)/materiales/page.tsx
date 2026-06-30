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
  ArrowDownUp,
  Image as ImageIcon,
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
  fortnights?: {
    project_name: string | null
    letter_week1: string | null
    letter_week2: string | null
    richmond_unit: string | null
  } | null
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
  youtube_videos: 'Videos YouTube',
  sorting_game: 'Ordena y clasifica',
  picture_word_match: '¿Cuál es la palabra?',
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
  youtube_videos: PlayCircle,
  sorting_game: ArrowDownUp,
  picture_word_match: ImageIcon,
  worksheet: FileText,
  worksheets: FileText,
}

// Card colors are assigned by POSITION (not type) from this palette so cards are vivid and no two
// adjacent ones repeat — index%8 differs for horizontal (+1) and vertical (+2/+3) neighbors in a
// 2- or 3-column grid.
const CARD_PALETTE = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
]

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

// All material types creatable standalone (no planeación). word_search + bingo are intentionally
// excluded — their routes require a fortnight_id, so they're created from a planeación instead.
const CREATABLE_TYPES = [
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'games', label: 'Memorama' },
  { key: 'matching', label: 'Matching' },
  { key: 'picture_word_match', label: 'Imagen-Palabra' },
  { key: 'sorting_game', label: 'Ordena y clasifica' },
  { key: 'letter_recognition', label: 'Reconoc. Letras' },
  { key: 'worksheets', label: 'Hoja de trabajo' },
  { key: 'youtube', label: 'Videos YouTube' },
]

export default function MaterialesPage() {
  const router = useRouter()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [allVocab, setAllVocab] = useState<{ id: string; word: string; letter?: string }[]>([])
  const [selectedVocab, setSelectedVocab] = useState<string[]>([])
  // Richmond teachers pick vocab BY UNIT (live book catalog); everyone picks own words by letter.
  const [richmondCatalog, setRichmondCatalog] = useState<
    { id: string; unit_number: number; unit_title: string; words: string[] }[]
  >([])
  const [vocabSource, setVocabSource] = useState<'own' | 'richmond'>('own')
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
        .select(
          'id, type, created_at:generated_at, lesson_plan_id, fortnight_id, fortnights(project_name, letter_week1, letter_week2, richmond_unit)'
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('teacher_id', (teacher as any).id)
        .order('generated_at', { ascending: false })

      setMaterials(data ?? [])
      setLoading(false)
    }
    load()
    fetch('/api/vocabulary')
      .then((r) => r.json())
      // API returns { vocabulary } (was read as d.items → chips were always empty).
      .then(async (d) => {
        setAllVocab(d.vocabulary ?? d.items ?? [])
        // Richmond teachers: load the live book catalog so vocab can be picked BY UNIT.
        if (d.editorial === 'richmond') {
          const supabase = createClient()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase as any)
            .from('richmond_units')
            .select('id, unit_number, unit_title, richmond_lesson_groups(sort_order, vocabulary)')
            .eq('book_code', 'TG5A')
            .order('unit_number', { ascending: true })
          if (Array.isArray(data)) {
            setRichmondCatalog(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.map((u: any) => ({
                id: u.id,
                unit_number: u.unit_number,
                unit_title: u.unit_title,
                words: Array.from(
                  new Set(
                    [...(u.richmond_lesson_groups ?? [])]
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .flatMap((g: any) => g.vocabulary ?? [])
                      .filter(Boolean)
                  )
                ) as string[],
              }))
            )
          }
        }
      })
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

            {/* Source: own words (by letter) vs Richmond book (by unit) — only for Richmond teachers */}
            {richmondCatalog.length > 0 && (
              <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                {(['own', 'richmond'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setVocabSource(s)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${vocabSource === s ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {s === 'own' ? 'Mi vocabulario (por letra)' : 'Richmond (por unidad)'}
                  </button>
                ))}
              </div>
            )}

            {vocabSource === 'own' ? (
              <>
                {/* Quick-select by letter — toggles all of that letter's words. */}
                {(() => {
                  const letters = Array.from(
                    new Set(
                      allVocab
                        .map((v) => (v.letter || v.word[0] || '').toUpperCase())
                        .filter(Boolean)
                    )
                  ).sort()
                  if (letters.length < 2) return null
                  return (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {letters.map((L) => {
                        const words = allVocab
                          .filter((v) => (v.letter || v.word[0] || '').toUpperCase() === L)
                          .map((v) => v.word)
                        const allSel = words.every((w) => selectedVocab.includes(w))
                        return (
                          <button
                            key={L}
                            type="button"
                            onClick={() =>
                              setSelectedVocab((p) =>
                                allSel
                                  ? p.filter((w) => !words.includes(w))
                                  : Array.from(new Set([...p, ...words]))
                              )
                            }
                            className={`h-7 w-7 rounded-md text-xs font-bold transition-colors ${allSel ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-300 hover:border-primary'}`}
                            title={`Seleccionar todas las palabras con ${L}`}
                          >
                            {L}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
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
              </>
            ) : (
              // Richmond: pick by unit. "Toda la unidad" selects every word; chips toggle individually.
              <div className="space-y-3 max-h-72 overflow-y-auto mb-2 pr-1">
                {richmondCatalog.map((u) => {
                  const allSel =
                    u.words.length > 0 && u.words.every((w) => selectedVocab.includes(w))
                  return (
                    <div key={u.id} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">
                          Unidad {u.unit_number}: {u.unit_title}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedVocab((p) =>
                              allSel
                                ? p.filter((w) => !u.words.includes(w))
                                : Array.from(new Set([...p, ...u.words]))
                            )
                          }
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${allSel ? 'bg-primary text-white' : 'border border-primary/40 text-primary hover:bg-primary/5'}`}
                        >
                          {allSel ? 'Quitar unidad' : 'Toda la unidad'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {u.words.map((w) => {
                          const sel = selectedVocab.includes(w)
                          return (
                            <button
                              key={w}
                              type="button"
                              onClick={() =>
                                setSelectedVocab((p) =>
                                  sel ? p.filter((x) => x !== w) : [...p, w]
                                )
                              }
                              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${sel ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}
                            >
                              {w}
                            </button>
                          )
                        })}
                        {u.words.length === 0 && (
                          <span className="text-xs text-gray-400">
                            Sin vocabulario en esta unidad
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
                {groups[date].map((m, idx) => {
                  const Icon = TYPE_ICONS[m.type] ?? Package
                  const colorClass = CARD_PALETTE[idx % CARD_PALETTE.length]
                  const label = TYPE_LABELS[m.type] ?? m.type
                  const isSel = selected.has(m.id)
                  // Context line: if this material belongs to a planeación, show its project + the
                  // week's letters or Richmond unit — not just the time.
                  const fn = m.fortnights
                  const letters = [fn?.letter_week1, fn?.letter_week2].filter(Boolean).join(' · ')
                  const context = fn
                    ? [fn.project_name, fn.richmond_unit || (letters && `Letras ${letters}`)]
                        .filter(Boolean)
                        .join(' — ')
                    : ''
                  const time = new Date(m.created_at).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const body = (
                    <Card
                      className={`p-4 border transition-shadow ${colorClass} ${
                        selectMode ? '' : 'cursor-pointer hover:shadow-md'
                      } ${isSel ? 'ring-2 ring-primary' : ''}`}
                    >
                      <Icon className="h-6 w-6 mb-2" />
                      <p className="text-sm font-semibold">{label}</p>
                      {context && (
                        <p className="mt-0.5 text-xs font-medium opacity-80 line-clamp-2">
                          {context}
                        </p>
                      )}
                      <p className="text-xs opacity-60 mt-0.5">{time}</p>
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
