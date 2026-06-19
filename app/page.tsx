import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Sparkles, BarChart3, Link2, CheckCircle2, ArrowRight } from 'lucide-react'

export default async function LandingPage() {
  // Authenticated users go straight to the app
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-xl text-gray-900">MaestraAI</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Para maestras de inglés en preescolar
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Planea una quincena <span className="text-indigo-600">en minutos,</span> no en horas
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            MaestraAI genera planeaciones alineadas al NEM y PRONI, crea materiales didácticos
            listos para imprimir, y da seguimiento a cada alumno — todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?type=teacher"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-medium px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              Soy maestra
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/register?type=school"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 text-base font-medium px-6 py-3 rounded-xl border border-gray-200 transition-colors"
            >
              Soy directora / administrador escolar
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">Gratis para empezar · Sin tarjeta de crédito</p>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="bg-indigo-600 py-4 px-4">
        <p className="text-center text-indigo-100 text-sm">
          Alineado al{' '}
          <span className="text-white font-semibold">Programa Sintético Fase 2, SEP 2024</span> ·
          Compatible con{' '}
          <span className="text-white font-semibold">Richmond LP · Kinder 1, 2 y 3</span>
        </p>
      </div>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">
            Todo lo que necesitas para planear mejor
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Desde la planeación hasta el reporte de alumnos, MaestraAI cubre cada parte de tu
            semana.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Sparkles,
                title: 'Planeaciones con IA',
                desc: 'Quincenas y talleres generados en segundos. La IA respeta tu formato escolar y el cronograma de tu grupo.',
                color: 'bg-indigo-100 text-indigo-600',
              },
              {
                icon: BookOpen,
                title: 'Materiales didácticos',
                desc: 'Flashcards, memoramas, sopas de letras, hojas de trabajo y bingo — listos para imprimir o proyectar en clase.',
                color: 'bg-violet-100 text-violet-600',
              },
              {
                icon: BarChart3,
                title: 'Seguimiento de alumnos',
                desc: 'Registra observaciones cualitativas por alumno y genera reportes trimestrales alineados al NEM.',
                color: 'bg-sky-100 text-sky-600',
              },
              {
                icon: Link2,
                title: 'Integración Richmond',
                desc: 'Sincroniza calificaciones de Richmond LP automáticamente con la extensión de Chrome.',
                color: 'bg-emerald-100 text-emerald-600',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <div className={`inline-flex p-3 rounded-xl mb-4 ${color}`}>
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            De cero a planeación en 3 pasos
          </h2>
          <div className="space-y-8">
            {[
              {
                step: '1',
                title: 'Crea tu grupo',
                desc: 'Registra tu escuela, grado y alumnos. MaestraAI configura tu horario semanal automáticamente.',
              },
              {
                step: '2',
                title: 'Genera tu planeación',
                desc: 'Elige quincena o taller, indica el proyecto del mes y la IA crea un plan completo con actividades, campos formativos y materiales.',
              },
              {
                step: '3',
                title: 'Descarga y enseña',
                desc: 'Exporta tu planeación en Word o PDF, imprime los materiales y proyecta las flashcards en clase.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mt-0.5">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 sm:px-6 bg-indigo-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 leading-relaxed italic">
            &ldquo;Que cada maestra tenga más tiempo para enseñar y menos para administrar.&rdquo;
          </h2>
          <p className="mt-4 text-sm text-gray-400">Nuestra misión</p>
        </div>
      </section>

      {/* CTA split — teacher vs school */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">
          {/* Teacher */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-8 flex flex-col">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Soy maestra</h3>
            <p className="text-gray-500 text-sm mb-6 flex-1">
              Regístrate sola y empieza a crear planeaciones para tu grupo en minutos.
            </p>
            <div className="space-y-2 mb-6">
              {[
                'Planeaciones quincenales y talleres',
                'Materiales didácticos con IA',
                'Diario de observaciones',
                'Exportación en Word y PDF',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 size={15} className="text-indigo-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link
              href="/register?type=teacher"
              className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Comenzar gratis
            </Link>
          </div>

          {/* School admin */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Soy directora / admin escolar</h3>
            <p className="text-gray-500 text-sm mb-6 flex-1">
              Crea una cuenta institucional, gestiona a tus maestras e invita a tu equipo.
            </p>
            <div className="space-y-2 mb-6">
              {[
                'Todo lo de la cuenta individual',
                'Gestión de múltiples maestras',
                'Anuncios y recursos compartidos',
                'Panel de seguimiento escolar',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link
              href="/register?type=school"
              className="w-full text-center bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Crear cuenta institucional
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© 2025 MaestraAI · Hecho con ♥ para maestras de México</span>
          <div className="flex gap-6">
            <Link href="/privacidad" className="hover:text-gray-600 transition-colors">
              Aviso de Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-gray-600 transition-colors">
              Términos de Servicio
            </Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
