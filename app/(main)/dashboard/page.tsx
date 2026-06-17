'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ZeroState } from '@/components/app/ZeroState'
import { Card } from '@/components/ui/card'
import { BookOpen, Database, FileText, Calendar, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getEditorialConfig } from '@/lib/editorial/registry'
import { motion } from 'framer-motion'

const PHRASES = [
  'Enseñar es sembrar semillas que florecerán toda la vida.',
  'Cada palabra que le enseñas a un niño es un escalón hacia su futuro.',
  'Los niños no recuerdan qué les enseñaste; recuerdan cómo los hiciste sentir.',
  'Lo que haces hoy en ese salón importará dentro de veinte años.',
  'Eres la primera gran maestra que muchos niños recordarán siempre.',
  'Tu paciencia y dedicación están construyendo personas, no solo alumnos.',
  'Educar en la infancia es moldear el mundo del mañana con las manos de hoy.',
  'Hacer que un niño ame aprender es el logro más grande que existe.',
  'El amor con que enseñas es tan importante como lo que enseñas.',
  'La infancia no se repite — y tú estás justo ahí, cuidándola.',
  'Cada "ya lo entendí" que escuchas es tuyo también.',
  'Enseñar requiere corazón, y el tuyo está en el lugar correcto.',
  'Tu vocación es de las pocas que deja huella en todas las demás.',
  'Hoy entras al salón y cambias el rumbo de alguien sin saberlo.',
  'Ser maestra de preescolar es darle al mundo su mejor comienzo.',
  'Lo que percibes como rutina es, para ellos, magia pura.',
  'Elegiste una carrera que importa. Eso no es poca cosa.',
  'Los primeros maestros son los que más duran en la memoria del corazón.',
  'Tu presencia en ese salón es lo más valioso de su día.',
  'No existe inversión más noble que formar a los más pequeños.',
]

export default function DashboardPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teacher, setTeacher] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastSync, setLastSync] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Increment localStorage counter on every mount — changes phrase each refresh
  const [phrase] = useState(() => {
    if (typeof window === 'undefined') return PHRASES[0]
    const next = (parseInt(localStorage.getItem('phraseIdx') ?? '-1') + 1) % PHRASES.length
    localStorage.setItem('phraseIdx', String(next))
    return PHRASES[next]
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      setTeacher(teacherData)
      setLoading(false)

      // Non-blocking — loads after page is already visible
      if (teacherData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(supabase as any)
          .from('richmond_sync_log')
          .select('*')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq('teacher_id', (teacherData as any).id)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()
          .then(({ data }: { data: unknown }) => setLastSync(data))
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        <div className="h-7 w-48 bg-surface rounded animate-pulse" />
        <div className="h-24 bg-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="p-4 sm:p-8">
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
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          ¡Hola, {teacher.full_name?.split(' ')[0] || 'Maestra'}!
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Phrase card */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative overflow-hidden mb-6 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-5 sm:p-6"
      >
        <span
          className="absolute -top-3 left-2 text-8xl font-serif text-indigo-100 select-none leading-none pointer-events-none"
          aria-hidden="true"
        >
          &ldquo;
        </span>
        <p className="relative text-sm sm:text-base text-indigo-900 italic leading-relaxed pl-4 pr-2">
          {phrase}
        </p>
        <p className="relative mt-3 pl-4 text-xs text-indigo-400 font-medium tracking-wide uppercase">
          Frase para maestras
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
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
          onClick={() => router.push('/alumnos')}
        >
          <Users size={32} className="text-primary mb-3" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Alumnos</h3>
          <p className="text-sm text-text-secondary">Seguimiento y progreso</p>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/boletas')}
        >
          <FileText size={32} className="text-primary mb-3" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Boletas</h3>
          <p className="text-sm text-text-secondary">Genera boletas cualitativas</p>
        </Card>

        {(() => {
          const ec = getEditorialConfig(teacher?.editorial)
          return ec.has_lms_sync && ec.sync_path ? (
            <Card
              className="p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(ec.sync_path!)}
            >
              <Database size={32} className="text-primary mb-3" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-text-primary mb-1">{ec.label}</h3>
              <p className="text-sm text-text-secondary">
                {lastSync
                  ? `Última sincronización: ${formatDate(lastSync.started_at)}`
                  : 'Sin sincronizar'}
              </p>
            </Card>
          ) : null
        })()}
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
