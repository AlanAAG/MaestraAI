'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GameContainer } from '@/components/games/GameContainer'
import { GameShell, PLAYABLE_TYPES } from '@/components/games/GameShell'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Material = {
  id: string
  type: string
  content: Record<string, unknown>
}

export default function JugarMaterialPage() {
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

      // Verify it's a playable material type (shared with GameShell)
      if (!PLAYABLE_TYPES.includes(materialData.type)) {
        setError('Este material no es un juego interactivo')
        setLoading(false)
        return
      }

      setMaterial(materialData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading material:', err)
      setError('Error al cargar el juego')
      setLoading(false)
    }
  }

  function handleExit() {
    router.back()
  }

  if (loading) {
    return (
      <GameContainer onExit={handleExit}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-text-secondary">Cargando juego...</p>
        </div>
      </GameContainer>
    )
  }

  if (error) {
    return (
      <GameContainer onExit={handleExit}>
        <div className="max-w-md text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-destructive" />
          <h2 className="text-2xl font-semibold text-text-primary">Error</h2>
          <p className="text-text-secondary">{error}</p>
          <Button onClick={handleExit} className="min-h-[44px]">
            Volver
          </Button>
        </div>
      </GameContainer>
    )
  }

  if (!material) {
    return (
      <GameContainer onExit={handleExit}>
        <div className="max-w-md text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-warning" />
          <h2 className="text-2xl font-semibold text-text-primary">Contenido no disponible</h2>
          <p className="text-text-secondary">Este juego no tiene contenido generado</p>
          <Button onClick={handleExit} className="min-h-[44px]">
            Volver
          </Button>
        </div>
      </GameContainer>
    )
  }

  return (
    <GameContainer onExit={handleExit}>
      <GameShell type={material.type} content={material.content} vocabulary={[]} />
    </GameContainer>
  )
}
