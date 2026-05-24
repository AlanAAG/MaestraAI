'use client'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { ZeroState } from '@/components/app/ZeroState'

export default function DashboardPage() {
  const router = useRouter()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-8">Bienvenida</h1>
      <ZeroState
        icon={BookOpen}
        title="Empieza con tu diario"
        description="Registra cómo fue tu semana en 5 minutos. La IA genera tu Diario de la Educadora listo para imprimir."
        ctaLabel="Registrar mi primera semana"
        onCta={() => router.push('/diario/nueva')}
        secondaryLabel="Ver ejemplo"
        onSecondary={() => router.push('/diary')}
      />
    </div>
  )
}
