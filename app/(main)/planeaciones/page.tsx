'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ZeroState } from '@/components/app/ZeroState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar, Plus, AlertCircle, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Fortnight {
  id: string
  number: number
  project_name: string
  start_date: string
  end_date: string
  status: 'draft' | 'approved'
}

interface LoadingState {
  status: 'idle' | 'loading' | 'error' | 'success'
  error?: string
}

export default function PlaneacionesPage() {
  const router = useRouter()
  const [fortnights, setFortnights] = useState<Fortnight[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>({ status: 'loading' })

  useEffect(() => {
    loadFortnights()
  }, [])

  async function loadFortnights() {
    setLoadingState({ status: 'loading' })
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setLoadingState({
          status: 'error',
          error: 'No se pudo verificar tu identidad. Por favor recarga la página.',
        })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher, error: teacherError } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (teacherError || !teacher) {
        setLoadingState({
          status: 'error',
          error: 'No se encontró tu perfil. Por favor completa la configuración.',
        })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fortnightsError } = await (supabase as any)
        .from('fortnights')
        .select('*')
        .eq('teacher_id', teacher.id)
        .order('start_date', { ascending: false })

      if (fortnightsError) {
        setLoadingState({
          status: 'error',
          error: 'Error al cargar tus planeaciones. Intenta de nuevo.',
        })
        return
      }

      setFortnights(data || [])
      setLoadingState({ status: 'success' })
    } catch (err) {
      console.error('Unexpected error loading fortnights:', err)
      setLoadingState({
        status: 'error',
        error: 'Algo salió mal. Por favor intenta de nuevo más tarde.',
      })
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta planeación? Se borrarán también sus materiales.')) return
    const res = await fetch(`/api/planner/${id}`, { method: 'DELETE' })
    if (res.ok) setFortnights((prev) => prev.filter((f) => f.id !== id))
  }

  // Loading skeleton
  if (loadingState.status === 'loading') {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-10 w-40 rounded-lg bg-muted animate-pulse" />
        </div>

        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-64 rounded-lg bg-muted animate-pulse" />
                  <div className="h-4 w-40 rounded-lg bg-muted animate-pulse" />
                </div>
                <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (loadingState.status === 'error') {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">No se pudo cargar</h3>
              <p className="text-sm text-destructive/80 mb-4">{loadingState.error}</p>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  onClick={() => loadFortnights()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Intentar de nuevo
                </Button>
                <Button size="sm" variant="outline" onClick={() => router.push('/dashboard')}>
                  Volver al inicio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (fortnights.length === 0) {
    return (
      <div className="p-8">
        <ZeroState
          icon={Calendar}
          title="¡Comienza tu primera planeación!"
          description="Crea una planeación quincenal y yo la generaré por ti en segundos"
          ctaLabel="Crear mi primera planeación"
          onCta={() => router.push('/planeaciones/nueva')}
        />
      </div>
    )
  }

  // Success state - list of fortnights
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Mis Planeaciones</h1>
          <p className="text-sm text-text-secondary mt-1">
            Tienes {fortnights.length} {fortnights.length === 1 ? 'planeación' : 'planeaciones'}
          </p>
        </div>
        <Button
          onClick={() => router.push('/planeaciones/nueva')}
          className="min-h-[44px] gap-2 bg-primary hover:bg-primary-dark whitespace-nowrap"
        >
          <Plus size={18} />
          Crear Planeación
        </Button>
      </div>

      <div className="grid gap-4">
        {fortnights.map((fortnight, index) => (
          <motion.div
            key={fortnight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              onClick={() => router.push(`/planeaciones/${fortnight.id}`)}
              className="p-6 cursor-pointer hover:shadow-lg active:shadow-md transition-all duration-200
                hover:border-primary/30 focus-within:ring-2 focus-within:ring-primary"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/planeaciones/${fortnight.id}`)
                }
              }}
              aria-label={`Abrir planeación: Quincena ${fortnight.number} - ${fortnight.project_name}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary truncate">
                    Quincena {fortnight.number} - {fortnight.project_name}
                  </h3>
                  <p className="text-sm text-text-secondary mt-2 flex flex-wrap gap-1">
                    <Calendar size={14} className="inline flex-shrink-0 mt-0.5" />
                    {formatDate(fortnight.start_date)} - {formatDate(fortnight.end_date)}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <StatusBadge status={fortnight.status} />
                  <button
                    onClick={(e) => handleDelete(e, fortnight.id)}
                    className="p-1.5 rounded-md text-text-disabled hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Eliminar planeación"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'draft' | 'approved' }) {
  const config = {
    draft: {
      label: 'Borrador',
      className: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      ariaLabel: 'Estado: Borrador - Sin revisar',
    },
    approved: {
      label: 'Aprobada',
      className: 'bg-success/10 text-success border border-success/20',
      ariaLabel: 'Estado: Aprobada',
    },
  }

  const { label, className, ariaLabel } = config[status]

  return (
    <span
      className={`inline-block text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${className}`}
      aria-label={ariaLabel}
    >
      {label}
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}
