'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ZeroState } from '@/components/app/ZeroState'
import { Card } from '@/components/ui/card'
import { BookOpen, Database, FileText, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const [teacher, setTeacher] = useState<any>(null)
  const [lastSync, setLastSync] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: teacherData } = await supabase
      .from('teachers')
      .select('*')
      .eq('auth_id', user.id)
      .single()

    setTeacher(teacherData)

    if (teacherData) {
      const typedTeacher = teacherData as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: syncLog } = await (supabase as any)
        .from('richmond_sync_log')
        .select('*')
        .eq('teacher_id', typedTeacher.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      setLastSync(syncLog)
    }
  }

  if (!teacher) {
    return (
      <div className="p-8">
        <ZeroState
          icon={Calendar}
          title="¡Bienvenida a MaestraAI!"
          description="Completa tu perfil en Configuración para comenzar"
          ctaLabel="Ir a Configuración"
          onCta={() => router.push('/configuracion')}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          ¡Hola, {teacher.full_name?.split(' ')[0] || 'Maestra'}!
        </h1>
        <p className="text-text-secondary mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          className="p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/planeaciones')}
        >
          <BookOpen size={32} className="text-primary mb-3" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Planeaciones</h3>
          <p className="text-sm text-text-secondary">Genera planeaciones quincenales</p>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/boletas')}
        >
          <FileText size={32} className="text-primary mb-3" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Boletas</h3>
          <p className="text-sm text-text-secondary">Genera boletas cualitativas</p>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/dashboard/richmond')}
        >
          <Database size={32} className="text-primary mb-3" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Richmond</h3>
          <p className="text-sm text-text-secondary">
            {lastSync ? `Última sincronización: ${formatDate(lastSync.started_at)}` : 'Sin sincronizar'}
          </p>
        </Card>
      </div>
    </div>
  )
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return 'Hace unos minutos'
  if (hours < 24) return `Hace ${hours}h`
  return date.toLocaleDateString('es-MX')
}
