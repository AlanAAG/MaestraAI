'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Download, Play, Monitor, Loader2 } from 'lucide-react'
import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Material = {
  id: string
  type: string
  content: any
  vocabulary: string[] | null
  created_at: string
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('materials' as any)
      .select('id, type, content, vocabulary, created_at')
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
    worksheets: 'Hoja de Trabajo',
    worksheet: 'Hoja de Trabajo',
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="text-xl font-semibold text-gray-900">
          {typeLabels[material.type] ?? material.type}
        </h1>
      </div>

      {/* Flashcards */}
      {material.type === 'flashcards' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {material.content?.cards?.length ?? 0} tarjetas generadas
          </p>
          <div className="flex gap-3">
            <Link href={`/materiales/${id}/proyectar`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Monitor className="mr-2 h-4 w-4" /> Proyectar en clase
              </Button>
            </Link>
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
          <Link href={`/materiales/${id}/jugar`}>
            <Button className="bg-green-600 hover:bg-green-700">
              <Play className="mr-2 h-4 w-4" /> Jugar en clase
            </Button>
          </Link>
        </Card>
      )}

      {/* Bingo */}
      {material.type === 'bingo' && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {material.content?.card_count ?? '?'} tarjetas únicas •{' '}
            {material.content?.vocabulary?.length ?? 0} palabras de vocabulario
          </p>
          <Link href={`/materiales/${id}/bingo`}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Download className="mr-2 h-4 w-4" /> Descargar PDF de Bingo
            </Button>
          </Link>
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
          <div className="space-y-3">
            {material.content?.items?.map(
              (
                item: {
                  word: string
                  target_letter: string
                  image_description: string
                  foil_letters: string[]
                },
                i: number
              ) => (
                <div key={i} className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-mono font-bold text-lg">
                      {item.target_letter}
                    </span>
                    <p className="font-medium text-gray-900">{item.word}</p>
                  </div>
                  <p className="text-sm text-gray-600">{item.image_description}</p>
                  {item.foil_letters?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {item.foil_letters.map((l: string, j: number) => (
                        <span
                          key={j}
                          className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 font-mono font-bold"
                        >
                          {l}
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

      {/* Matching */}
      {material.type === 'matching' && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Pares de Matching</h2>
          <div className="space-y-3">
            {material.content?.pairs?.map(
              (
                pair: { left: string; right: string; left_type: string; right_type: string },
                i: number
              ) => (
                <div key={i} className="flex items-center gap-4 rounded-lg bg-gray-50 p-3">
                  <div className="flex-1 text-center rounded border border-blue-200 bg-blue-50 p-2">
                    <p className="text-xs text-blue-500 mb-1">{pair.left_type}</p>
                    <p className="font-medium text-blue-900">{pair.left}</p>
                  </div>
                  <span className="text-gray-400">↔</span>
                  <div className="flex-1 text-center rounded border border-green-200 bg-green-50 p-2">
                    <p className="text-xs text-green-500 mb-1">{pair.right_type}</p>
                    <p className="font-medium text-green-900">{pair.right}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
      )}

      {/* YouTube recommendations */}
      {material.type === 'youtube' && (
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
                },
                i: number
              ) => (
                <div key={i} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{v.title}</p>
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
                  <p className="text-xs text-amber-600 font-medium mt-2">
                    ⚠ Verifica antes de usar en clase
                  </p>
                </div>
              )
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
