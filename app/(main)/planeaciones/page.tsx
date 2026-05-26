'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ZeroState } from '@/components/app/ZeroState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar, Plus } from 'lucide-react'

export default function PlaneacionesPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fortnights, setFortnights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFortnights()
  }, [])

  async function loadFortnights() {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error:', authError)
        setLoading(false)
        return
      }

      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      // Get teacher_id first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher, error: teacherError } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (teacherError) {
        console.error('Teacher query error:', teacherError)
        setLoading(false)
        return
      }

      if (!teacher) {
        console.error('No teacher record found for user')
        setLoading(false)
        return
      }

      // Query fortnights
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fortnightsError } = await (supabase as any)
        .from('fortnights')
        .select('*')
        .eq('teacher_id', teacher.id)
        .order('start_date', { ascending: false })

      if (fortnightsError) {
        console.error('Fortnights query error:', fortnightsError)
        setLoading(false)
        return
      }

      setFortnights(data || [])
      setLoading(false)
    } catch (err) {
      console.error('Unexpected error loading fortnights:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Cargando...</div>
  }

  if (fortnights.length === 0) {
    return (
      <div className="p-8">
        <ZeroState
          icon={Calendar}
          title="No hay planeaciones aún"
          description="Crea tu primera planeación quincenal y MaestraAI la generará por ti"
          ctaLabel="Nueva Planeación"
          onCta={() => router.push('/planeaciones/nueva')}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Planeaciones</h1>
        <Button
          onClick={() => router.push('/planeaciones/nueva')}
          className="min-h-[44px] gap-2 bg-primary hover:bg-primary-dark"
        >
          <Plus size={18} />
          Nueva Planeación
        </Button>
      </div>

      <div className="grid gap-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {fortnights.map((fortnight: any) => (
          <Card
            key={fortnight.id}
            className="p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/planeaciones/${fortnight.id}`)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Quincena {fortnight.number} - {fortnight.project_name}
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  {formatDate(fortnight.start_date)} - {formatDate(fortnight.end_date)}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    fortnight.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {fortnight.status === 'approved' ? 'Aprobada' : 'Borrador'}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}
