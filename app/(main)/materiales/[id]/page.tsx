'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Download,
  Play,
  Monitor,
  Loader2,
  Share2,
  Copy,
  Check,
  X,
  Headphones,
} from 'lucide-react'
import Link from 'next/link'
import { ListenAndTap, type ListenPair } from '@/components/games/ListenAndTap'
import { VocabVisual } from '@/components/games/VocabVisual'
import { GameShell, PLAYABLE_TYPES } from '@/components/games/GameShell'
import { wordToEmoji } from '@/lib/materials/emoji'

type Material = {
  id: string
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any
  vocabulary: string[] | null
  created_at: string
  lesson_plan_id: string | null
  lesson_plans: { day_number: number } | null
  fortnights: { project_name: string } | null
}

async function downloadPdf(materialId: string, filename: string): Promise<string | null> {
  const res = await fetch('/api/materials/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ material_id: materialId }),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    return (d as { error?: string }).error || 'Error al generar PDF'
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return null
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [playUrl, setPlayUrl] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [listenPairs, setListenPairs] = useState<ListenPair[] | null>(null)
  const [sharingSchool, setSharingSchool] = useState(false)
  const [shareSchoolSuccess, setShareSchoolSuccess] = useState(false)

  async function handleShare() {
    if (playUrl) {
      setShowShareModal(true)
      return
    }
    setSharing(true)
    try {
      const res = await fetch(`/api/materials/${id}/play-token`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const { play_url } = (await res.json()) as { play_url: string }
      setPlayUrl(play_url)
      setShowShareModal(true)
    } catch {
      setError('No se pudo crear el enlace de compartir')
    } finally {
      setSharing(false)
    }
  }

  async function handleCopy() {
    if (!playUrl) return
    await navigator.clipboard.writeText(playUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async (filename: string) => {
    setDownloading(true)
    const err = await downloadPdf(id, filename)
    if (err) setError(err)
    setDownloading(false)
  }

  async function handleShareWithSchool() {
    if (!material) return
    const resourceTypeMap: Record<string, string> = {
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
    setSharingSchool(true)
    try {
      const res = await fetch('/api/school/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: typeLabels[material.type] ?? material.type,
          file_url: window.location.href,
          resource_type: resourceTypeMap[material.type] ?? 'other',
        }),
      })
      if (!res.ok) throw new Error()
      setShareSchoolSuccess(true)
      setTimeout(() => setShareSchoolSuccess(false), 3000)
    } catch {
      setError('No se pudo compartir con la escuela')
    } finally {
      setSharingSchool(false)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('materials' as any)
      .select(
        // Column is generated_at; alias to created_at (selecting created_at 400s → "no encontrado").
        'id, type, content, vocabulary, created_at:generated_at, lesson_plan_id, lesson_plans(day_number), fortnights(project_name)'
      )
      .eq('id', id)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error: err }: any) => {
        if (err || !data) setError('No se encontró el material')
        else setMaterial(data)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !material) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">{error ?? 'Material no encontrado'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    )
  }

  const typeLabels: Record<string, string> = {
    flashcards: 'Flashcards',
    memory_game: 'Memorama',
    bingo: 'Bingo',
    word_search: 'Sopa de Letras',
    song_worksheet: 'Hoja de Canción',
    letter_recognition: 'Reconocimiento de Letras',
    matching: 'Matching',
    youtube: 'Videos YouTube',
    youtube_videos: 'Videos YouTube',
    worksheets: 'Hoja de Trabajo',
    worksheet: 'Hoja de Trabajo',
    picture_word_match: '¿Cuál es la palabra?',
    sorting_game: 'Ordena y clasifica',
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex-1">
          {material.fortnights && material.lesson_plans && (
            <p className="text-xs text-gray-400 mb-0.5">
              {material.fortnights.project_name} · Día {material.lesson_plans.day_number}
            </p>
          )}
          <h1 className="text-xl font-semibold text-gray-900">
            {typeLabels[material.type] ?? material.type}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShareWithSchool}
          disabled={sharingSchool || shareSchoolSuccess}
          className="gap-2 shrink-0"
        >
          <Share2 className="h-4 w-4" />
          {shareSchoolSuccess
            ? '¡Compartido!'
            : sharingSchool
              ? 'Compartiendo...'
              : 'Compartir con escuela'}
        </Button>
      </div>

      {/* Playable game front-and-center — the detail page IS the game for these types.
          Teacher tools (PDF / caller / share) stay available in the per-type blocks below. */}
      {PLAYABLE_TYPES.includes(material.type) && (
        <GameShell
          type={material.type}
          content={(material.content ?? {}) as Record<string, unknown>}
          vocabulary={
            (material.vocabulary ??
              (material.content as { vocabulary?: string[] })?.vocabulary ??
              []) as string[]
          }
        />
      )}

      {/* Flashcards */}
      {material.type === 'flashcards' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {material.content?.cards?.length ?? 0} tarjetas generadas
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href={`/materiales/${id}/proyectar`}>
              <Button className="bg-blue-600 hover:bg-blue-700 min-h-[44px]">
                <Monitor className="mr-2 h-4 w-4" /> Proyectar en clase
              </Button>
            </Link>
            {(() => {
              const imagePairs: ListenPair[] = (material.content?.cards ?? [])
                .map((c: { word: string; image_url?: string; emoji?: string }) => ({
                  word: c.word,
                  image_url: c.image_url,
                  emoji: c.emoji,
                }))
                .filter((c: ListenPair) => c.emoji || wordToEmoji(c.word) || c.image_url)
              if (imagePairs.length < 2) return null
              return (
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => setListenPairs(imagePairs)}
                >
                  <Headphones className="mr-2 h-4 w-4" /> Modo Escucha
                </Button>
              )
            })()}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {material.content?.cards
              ?.slice(0, 6)
              .map((card: { word: string; definition: string }, i: number) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-semibold text-gray-900">{card.word}</p>
                  <p className="text-sm text-gray-600 mt-1">{card.definition}</p>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Memory game */}
      {material.type === 'memory_game' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {material.content?.pairs?.length ?? 0} pares de tarjetas
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href={`/materiales/${id}/jugar`}>
              <Button className="bg-green-600 hover:bg-green-700 min-h-[44px]">
                <Play className="mr-2 h-4 w-4" /> Jugar en clase
              </Button>
            </Link>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Compartir con alumnos
            </Button>
            {(() => {
              const imagePairs: ListenPair[] = (material.content?.pairs ?? [])
                .map((p: { word: string; image_url?: string; emoji?: string }) => ({
                  word: p.word,
                  image_url: p.image_url,
                  emoji: p.emoji,
                }))
                .filter((p: ListenPair) => p.emoji || wordToEmoji(p.word) || p.image_url)
              if (imagePairs.length < 2) return null
              return (
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => setListenPairs(imagePairs)}
                >
                  <Headphones className="mr-2 h-4 w-4" /> Modo Escucha
                </Button>
              )
            })()}
          </div>
        </Card>
      )}

      {/* Bingo */}
      {material.type === 'bingo' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {material.content?.card_count ?? '?'} tarjetas únicas •{' '}
            {material.content?.vocabulary?.length ?? 0} palabras de vocabulario
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href={`/materiales/${id}/bingo`}>
              <Button className="bg-purple-600 hover:bg-purple-700 min-h-[44px]">
                <Download className="mr-2 h-4 w-4" /> Descargar PDF de Bingo
              </Button>
            </Link>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Compartir con alumnos
            </Button>
          </div>
          {material.content?.vocabulary && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Vocabulario
              </p>
              <div className="flex flex-wrap gap-2">
                {material.content.vocabulary.map((w: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-full bg-purple-50 text-purple-800 text-sm"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Word Search */}
      {material.type === 'word_search' && (
        <Card className="p-6 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => handleDownload('SopaDeLetras.pdf')}
              disabled={downloading}
              className="bg-yellow-600 hover:bg-yellow-700 min-h-[44px]"
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar PDF
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Compartir con alumnos
            </Button>
          </div>
          <div className="overflow-auto">
            <table className="border-collapse font-mono text-sm">
              <tbody>
                {material.content?.grid?.map((row: string[], ri: number) => (
                  <tr key={ri}>
                    {row.map((cell: string, ci: number) => (
                      <td
                        key={ci}
                        className="w-8 h-8 text-center border border-gray-200 font-bold text-gray-800"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Palabras a encontrar
            </p>
            <div className="flex flex-wrap gap-2">
              {material.content?.words?.map((w: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800">
              Para Kinder 3 (alumnos sin lecto-escritura)
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Muestra la imagen de cada palabra antes de buscarla. Guíalos letra por letra. Este
              material funciona mejor como actividad grupal con proyector.
            </p>
          </div>
        </Card>
      )}

      {/* Song Worksheet */}
      {material.type === 'song_worksheet' && (
        <div className="space-y-4">
          <Button
            onClick={() => handleDownload('HojaCancion.pdf')}
            disabled={downloading}
            className="bg-pink-600 hover:bg-pink-700"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </Button>
          {material.content?.lyric_worksheet && (
            <Card className="p-6">
              <h2 className="font-semibold text-gray-900 mb-3">
                📝 {material.content.lyric_worksheet.title}
              </h2>
              <div className="space-y-2">
                {material.content.lyric_worksheet.lines?.map(
                  (
                    line: {
                      text: string
                      missing_word: string
                      options?: { word: string; image_description: string; correct: boolean }[]
                    },
                    i: number
                  ) => (
                    <div key={i} className="space-y-2 pb-3 border-b border-gray-100 last:border-0">
                      <p className="text-gray-800">
                        {line.text.replace(line.missing_word, '___________')}
                      </p>
                      {line.options && line.options.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {line.options.map((opt, j) => (
                            <span
                              key={j}
                              className={`px-3 py-1 rounded-full text-sm border ${opt.correct ? 'bg-green-50 text-green-800 border-green-300 font-medium' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                            >
                              {opt.image_description}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </Card>
          )}
          {material.content?.tpr_guide && material.content.tpr_guide.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold text-gray-900 mb-3">🎵 Guía TPR</h2>
              <div className="space-y-2">
                {material.content.tpr_guide.map(
                  (item: { word: string; gesture: string }, i: number) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="font-medium text-blue-700 w-40 flex-shrink-0">
                        &quot;{item.word}&quot;
                      </span>
                      <span className="text-gray-700">{item.gesture}</span>
                    </div>
                  )
                )}
              </div>
            </Card>
          )}
          {material.content?.vocab_cards && material.content.vocab_cards.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold text-gray-900 mb-3">📚 Vocabulario</h2>
              <div className="grid grid-cols-2 gap-3">
                {material.content.vocab_cards.map(
                  (card: { word: string; image_description: string }, i: number) => (
                    <div key={i} className="rounded-lg border border-gray-200 p-3">
                      <p className="font-semibold text-gray-900">{card.word}</p>
                      <p className="text-sm text-gray-600">{card.image_description}</p>
                    </div>
                  )
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Letter Recognition */}
      {material.type === 'letter_recognition' && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Actividades de Reconocimiento</h2>
          <Button
            onClick={() => handleDownload('Reconocimiento.pdf')}
            disabled={downloading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </Button>
          <div className="space-y-3">
            {material.content?.items?.map(
              (
                item: {
                  word: string
                  target_letter: string
                  image_description: string
                  foil_letters: string[]
                  emoji?: string
                  image_url?: string
                },
                i: number
              ) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                  <VocabVisual
                    word={item.word}
                    emoji={item.emoji}
                    imageUrl={item.image_url}
                    className="h-14 w-14 shrink-0"
                    emojiClassName="text-4xl leading-none"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 font-mono text-lg font-bold text-blue-800">
                        {item.target_letter}
                      </span>
                      <p className="font-medium text-gray-900">{item.word}</p>
                    </div>
                    <p className="text-sm text-gray-600">{item.image_description}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
      )}

      {/* Matching */}
      {material.type === 'matching' && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Pares de Matching</h2>
          <Button
            onClick={() => handleDownload('Matching.pdf')}
            disabled={downloading}
            className="bg-green-600 hover:bg-green-700"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </Button>
          <div className="space-y-3">
            {material.content?.pairs?.map(
              (
                pair: {
                  word: string
                  translation: string
                  image_description: string
                  image_url?: string
                },
                i: number
              ) => (
                <div key={i} className="flex items-center gap-4 rounded-lg bg-gray-50 p-3">
                  <div className="flex-1 text-center rounded border border-blue-200 bg-blue-50 p-2">
                    <p className="text-xs text-blue-500 mb-1">palabra</p>
                    <p className="font-medium text-blue-900">{pair.word}</p>
                    <p className="text-xs text-blue-400 mt-1">{pair.translation}</p>
                  </div>
                  <span className="text-gray-400">↔</span>
                  <div className="flex-1 text-center rounded border border-green-200 bg-green-50 p-2">
                    {pair.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pair.image_url}
                        alt={pair.word}
                        className="w-16 h-16 object-contain mx-auto rounded"
                      />
                    ) : (
                      <p className="font-medium text-green-900 text-sm">{pair.image_description}</p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
      )}

      {/* YouTube recommendations */}
      {(material.type === 'youtube_videos' || material.type === 'youtube') && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Videos Recomendados</h2>
          <div className="space-y-3">
            {material.content?.videos?.map(
              (
                v: {
                  title: string
                  channel: string
                  duration: string
                  description: string
                  verified?: boolean
                  has_subtitles?: boolean
                  search_url?: string
                },
                i: number
              ) => {
                const url =
                  v.search_url ||
                  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${v.title} ${v.channel}`)}`
                return (
                  <div key={i} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          ▶ {v.title}
                        </a>
                        <p className="text-sm text-gray-500">
                          {v.channel} · {v.duration}
                        </p>
                      </div>
                      {v.has_subtitles && (
                        <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          CC
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{v.description}</p>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Buscar en YouTube →
                    </a>
                    <p className="text-xs text-amber-600 font-medium mt-1">
                      ⚠ Verifica antes de usar en clase
                    </p>
                  </div>
                )
              }
            )}
          </div>
        </Card>
      )}

      {/* Picture Word Match */}
      {material.type === 'picture_word_match' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {material.content?.items?.length ?? 0} palabras con opciones
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              className="bg-violet-600 hover:bg-violet-700 min-h-[44px]"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Compartir con alumnos
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {material.content?.items
              ?.slice(0, 6)
              .map((item: { word: string; image_url?: string; foils: string[] }, i: number) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-1">
                  <p className="font-semibold text-gray-900">{item.word}</p>
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.word}
                      className="w-12 h-12 object-contain rounded"
                    />
                  )}
                  <p className="text-xs text-gray-400">Foils: {item.foils?.join(', ')}</p>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Sorting Game */}
      {material.type === 'sorting_game' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {material.content?.categories?.length ?? 0} categorías ·{' '}
            {material.content?.items?.length ?? 0} palabras
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              className="bg-teal-600 hover:bg-teal-700 min-h-[44px]"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Compartir con alumnos
            </Button>
          </div>
          <div className="flex gap-3 flex-wrap">
            {material.content?.categories?.map(
              (cat: { name: string; color: string }, i: number) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-xl border-2 text-sm font-medium bg-gray-50 border-gray-200 text-gray-700"
                >
                  {cat.name}
                </span>
              )
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {material.content?.items?.map(
              (item: { word: string; category: string; image_url?: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm"
                >
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.word}
                      className="w-5 h-5 object-contain rounded-full"
                    />
                  )}
                  <span>{item.word}</span>
                  <span className="text-xs text-gray-400">→ {item.category}</span>
                </div>
              )
            )}
          </div>
        </Card>
      )}

      {/* Listen & Tap modal */}
      {listenPairs && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-indigo-600" />
                <h2 className="font-semibold text-gray-900">Modo Escucha</h2>
              </div>
              <button
                onClick={() => setListenPairs(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ListenAndTap pairs={listenPairs} onComplete={() => setListenPairs(null)} />
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && playUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Compartir con alumnos</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* QR code */}
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(playUrl)}&ecc=L`}
                alt="QR code para el juego"
                width={180}
                height={180}
                className="rounded-xl border border-gray-200"
              />
            </div>

            {/* URL copy */}
            <div className="flex gap-2">
              <input
                readOnly
                value={playUrl}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 truncate"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer min-w-[80px] justify-center"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" /> ¡Listo!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copiar
                  </>
                )}
              </button>
            </div>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`¡A jugar! Entra aquí: ${playUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white font-medium text-sm transition-colors"
            >
              Enviar por WhatsApp
            </a>

            <p className="text-xs text-gray-400 text-center">
              Los alumnos no necesitan cuenta para jugar
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
