'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Download, Loader2, Projector } from 'lucide-react'
import { BingoCallerMode } from '@/components/games/BingoCallerMode'

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
  const [callerMode, setCallerMode] = useState(false)
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
      // Use export route — no new DB record created on re-download
      const res = await fetch('/api/materials/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: id }),
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

  if (callerMode && material) {
    return (
      <BingoCallerMode
        vocabulary={material.content.vocabulary ?? []}
        title="Bingo"
        onExit={() => setCallerMode(false)}
      />
    )
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="text-xl font-semibold text-text-primary">Bingo — Descargar PDF</h1>
      </div>

      {error && <p className="text-error text-sm">{error}</p>}

      {material && (
        <Card className="p-6 space-y-4">
          <div className="space-y-1 text-sm text-text-secondary">
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
              <span key={i} className="px-2 py-1 rounded-full bg-brand-subtle text-brand text-sm">
                {w}
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              onClick={() => setCallerMode(true)}
              variant="outline"
              className="flex-1 border-brand text-brand hover:bg-brand-subtle"
            >
              <Projector className="mr-2 h-4 w-4" /> Proyectar Bingo
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 bg-brand hover:bg-brand-hover"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Descargar PDF
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-text-muted text-center">
            Incluye tarjetas de jugadores y una página de tarjetas del maestro para llamar palabras
          </p>
        </Card>
      )}
    </div>
  )
}
