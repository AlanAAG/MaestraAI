'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FlashcardProjector, type Flashcard } from '@/components/games/FlashcardProjector'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Material = {
  id: string
  type: string
  content: {
    cards?: Flashcard[]
  }
}

export default function ProyectarPage() {
  const params = useParams()
  const router = useRouter()
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMaterial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadMaterial() {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setError('No autorizado. Por favor inicia sesión.')
        setLoading(false)
        return
      }

      // Get material
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: materialData, error: materialError } = await (supabase as any)
        .from('materials')
        .select('*')
        .eq('id', params.id)
        .single()

      if (materialError || !materialData) {
        setError('No se encontró el material')
        setLoading(false)
        return
      }

      // Verify it's a flashcard type material
      if (materialData.type !== 'flashcards') {
        setError('Este material no es un conjunto de tarjetas')
        setLoading(false)
        return
      }

      // Verify it has cards
      if (!materialData.content?.cards || materialData.content.cards.length === 0) {
        setError('Este conjunto de tarjetas no tiene contenido')
        setLoading(false)
        return
      }

      setMaterial(materialData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading material:', err)
      setError('Error al cargar el material')
      setLoading(false)
    }
  }

  function handleExit() {
    router.back()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-text-secondary">Cargando tarjetas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-destructive" />
          <h2 className="text-2xl font-semibold text-text-primary">Error</h2>
          <p className="text-text-secondary">{error}</p>
          <Button onClick={handleExit} className="min-h-[44px]">
            Volver
          </Button>
        </div>
      </div>
    )
  }

  if (!material || !material.content?.cards) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-warning" />
          <h2 className="text-2xl font-semibold text-text-primary">Contenido no disponible</h2>
          <p className="text-text-secondary">
            Este conjunto de tarjetas no tiene contenido generado
          </p>
          <Button onClick={handleExit} className="min-h-[44px]">
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return <FlashcardProjector cards={material.content.cards} onExit={handleExit} />
}
