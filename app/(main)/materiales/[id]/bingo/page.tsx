'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'

export default function BingoRedownloadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [material, setMaterial] = useState<{
    content: { card_count: number; free_space: boolean; vocabulary: string[] }
    fortnight_id: string
    lesson_plan_id: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('materials' as any)
      .select('content, fortnight_id, lesson_plan_id')
      .eq('id', id)
      .eq('type', 'bingo')
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error: err }: any) => {
        if (err || !data) setError('No se encontró el material de bingo')
        else setMaterial(data)
        setLoading(false)
      })
  }, [id])

  const handleDownload = async () => {
    if (!material) return
    setDownloading(true)
    try {
      const res = await fetch('/api/materials/bingo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fortnight_id: material.fortnight_id,
          lesson_plan_id: material.lesson_plan_id,
          card_count: material.content.card_count,
          free_space: material.content.free_space,
          vocabulary: material.content.vocabulary,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al generar PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bingo-${material.content.card_count}-tarjetas.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="text-xl font-semibold text-gray-900">Bingo — Descargar PDF</h1>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {material && (
        <Card className="p-6 space-y-4">
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <span className="font-medium">Tarjetas:</span> {material.content.card_count}
            </p>
            <p>
              <span className="font-medium">Casilla FREE:</span>{' '}
              {material.content.free_space ? 'Sí' : 'No'}
            </p>
            <p>
              <span className="font-medium">Palabras:</span>{' '}
              {material.content.vocabulary?.length ?? 0}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {material.content.vocabulary?.map((w: string, i: number) => (
              <span key={i} className="px-2 py-1 rounded-full bg-purple-50 text-purple-800 text-sm">
                {w}
              </span>
            ))}
          </div>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-purple-600 hover:bg-purple-700 mt-2"
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Descargar {material.content.card_count}{' '}
                tarjetas
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Incluye tarjetas de jugadores y una página de tarjetas del maestro para llamar palabras
          </p>
        </Card>
      )}
    </div>
  )
}
