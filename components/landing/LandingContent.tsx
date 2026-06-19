'use client'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  BarChart3,
  Link2,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
} from 'lucide-react'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] },
})

const FEATURES = [
  {
    icon: Sparkles,
    color: 'from-indigo-500 to-violet-600',
    title: 'Planeaciones con IA',
    desc: 'Quincenas y talleres completos en segundos. La IA sigue tu formato escolar, respeta el cronograma de tu grupo y cita el Programa Sintético SEP 2024.',
  },
  {
    icon: BookOpen,
    color: 'from-violet-500 to-purple-600',
    title: 'Materiales didácticos',
    desc: 'Flashcards, memoramas, sopas de letras, bingo y hojas de trabajo — generados en automático, listos para imprimir o proyectar en clase.',
  },
  {
    icon: BarChart3,
    color: 'from-sky-500 to-indigo-600',
    title: 'Seguimiento de alumnos',
    desc: 'Registra observaciones cualitativas por alumno y genera reportes trimestrales alineados al NEM — sin calificaciones numéricas.',
  },
  {
    icon: Link2,
    color: 'from-emerald-500 to-teal-600',
    title: 'Integración Richmond',
    desc: 'Sincroniza calificaciones de Richmond LP automáticamente con la extensión de Chrome. Tus datos, en tu plataforma.',
  },
]

const BEFORE = [
  { icon: Clock, text: '4 horas los domingos planificando' },
  { icon: FileText, text: 'Buscar el formato correcto cada quincena' },
  { icon: GraduationCap, text: 'Calificaciones en Excel por separado' },
]

const AFTER = [
  { icon: Clock, text: 'Plan completo en 30 minutos' },
  { icon: FileText, text: 'Tu formato, tu escuela, cada vez' },
  { icon: GraduationCap, text: 'Richmond sincronizado automáticamente' },
]

export default function LandingContent() {
  const reduced = useReducedMotion()
  const mv = reduced ? { initial: {}, whileInView: {}, transition: {} } : null

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-950 font-sans antialiased overflow-x-hidden">
      {/* ── Floating Nav ── */}
      <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-4">
        <nav className="w-full max-w-5xl flex items-center justify-between px-5 h-14 rounded-2xl bg-white/85 backdrop-blur-md border border-gray-200 shadow-sm shadow-gray-100">
          <span className="font-bold text-base text-gray-900 tracking-tight">MaestraAI</span>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-500 font-medium">
            <a
              href="#como-funciona"
              className="hover:text-gray-900 transition-colors cursor-pointer"
            >
              Cómo funciona
            </a>
            <a href="#para-quien" className="hover:text-gray-900 transition-colors cursor-pointer">
              Para quién
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 cursor-pointer"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer"
            >
              Empezar gratis
            </Link>
          </div>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-24 pb-16 text-center overflow-hidden">
        {/* Aurora blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-indigo-400/20 blur-[120px]"
            style={{ animation: 'pulse 6s ease-in-out infinite' }}
          />
          <div
            className="absolute top-10 -right-40 w-[500px] h-[500px] rounded-full bg-violet-400/15 blur-[100px]"
            style={{ animation: 'pulse 8s ease-in-out infinite', animationDelay: '2s' }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-sky-400/10 blur-[100px]"
            style={{ animation: 'pulse 10s ease-in-out infinite', animationDelay: '4s' }}
          />
        </div>

        {/* Badge */}
        <motion.div {...(mv ?? fadeUp(0))}>
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide">
            <Sparkles size={12} strokeWidth={2.5} />
            Para maestras de inglés en preescolar · NEM + PRONI 2024
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...(mv ?? fadeUp(0.08))}
          className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-950 leading-[1.05] tracking-tight max-w-3xl"
        >
          Planea una quincena{' '}
          <span className="relative">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
              en 30 minutos
            </span>
          </span>{' '}
          — no en horas
        </motion.h1>

        <motion.p
          {...(mv ?? fadeUp(0.16))}
          className="mt-6 text-lg sm:text-xl text-gray-500 max-w-xl leading-relaxed"
        >
          MaestraAI genera planeaciones alineadas al NEM y PRONI, crea materiales didácticos listos
          para imprimir, y da seguimiento a cada alumno.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...(mv ?? fadeUp(0.22))}
          className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link
            href="/register?type=teacher"
            className="group inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-semibold px-7 py-3.5 rounded-2xl transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 cursor-pointer"
          >
            Soy maestra
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/register?type=school"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 text-base font-semibold px-7 py-3.5 rounded-2xl border border-gray-200 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
          >
            Soy directora / admin escolar
          </Link>
        </motion.div>

        {/* Stat pills */}
        <motion.div {...(mv ?? fadeUp(0.3))} className="mt-10 flex flex-wrap justify-center gap-3">
          {[
            '< 30 min por planeación',
            'Alineado al NEM · SEP 2024',
            'Compatible con Richmond LP',
          ].map((s) => (
            <span
              key={s}
              className="bg-white border border-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-full shadow-sm"
            >
              {s}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ── Trust bar ── */}
      <div className="bg-white border-y border-gray-100 py-5 px-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
            Alineado con
          </span>
          {[
            'Programa Sintético Fase 2, SEP 2024',
            'PRONI',
            '4 Campos Formativos',
            'Richmond LP',
          ].map((t) => (
            <span key={t} className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Before / After transformation ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div {...(mv ?? fadeUp())} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mb-3">
              Antes vs. con MaestraAI
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Así se ve la diferencia en tu semana cuando la planificación ya no es el problema.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Before */}
            <motion.div
              {...(mv ?? fadeUp(0.05))}
              className="rounded-3xl border border-gray-200 bg-gray-50 p-8"
            >
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">
                Antes
              </span>
              <div className="space-y-5">
                {BEFORE.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center">
                      <Icon size={16} className="text-gray-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed pt-1.5 line-through decoration-gray-300">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* After */}
            <motion.div
              {...(mv ?? fadeUp(0.12))}
              className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-8 relative overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/30 rounded-full blur-2xl"
              />
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-500 mb-6">
                Con MaestraAI
              </span>
              <div className="space-y-5">
                {AFTER.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Icon size={16} className="text-indigo-600" strokeWidth={1.75} />
                    </div>
                    <p className="text-gray-800 text-sm leading-relaxed pt-1.5 font-medium">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div {...(mv ?? fadeUp())} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mb-3">
              Todo lo que necesitas para enseñar mejor
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Desde la planeación hasta el reporte trimestral, MaestraAI cubre cada etapa de tu
              semana.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, color, title, desc }, i) => (
              <motion.div
                key={title}
                {...(mv ?? fadeUp(i * 0.07))}
                className="group rounded-3xl border border-gray-100 bg-gray-50 hover:bg-white p-8 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100 hover:-translate-y-1 cursor-default"
              >
                <div
                  className={`inline-flex w-11 h-11 rounded-2xl bg-gradient-to-br ${color} items-center justify-center mb-5 shadow-sm`}
                >
                  <Icon size={20} className="text-white" strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div {...(mv ?? fadeUp())} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mb-3">
              De cero a planeación lista
            </h2>
            <p className="text-gray-500">
              Sin curvas de aprendizaje. Funciona desde el primer día.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connecting line — desktop only */}
            <div
              aria-hidden
              className="hidden md:block absolute top-8 left-[calc(16.666%+20px)] right-[calc(16.666%+20px)] h-px bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200"
            />

            <div className="grid md:grid-cols-3 gap-10">
              {[
                {
                  n: '01',
                  title: 'Crea tu grupo',
                  desc: 'Registra tu escuela, grado y alumnos. MaestraAI configura tu horario automáticamente.',
                },
                {
                  n: '02',
                  title: 'Genera tu planeación',
                  desc: 'Elige quincena o taller. La IA crea el plan completo con actividades, campos formativos y materiales.',
                },
                {
                  n: '03',
                  title: 'Descarga y enseña',
                  desc: 'Exporta en Word o PDF, imprime los materiales y proyecta las flashcards en clase.',
                },
              ].map(({ n, title, desc }, i) => (
                <motion.div
                  key={n}
                  {...(mv ?? fadeUp(i * 0.1))}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white border-2 border-indigo-100 shadow-sm mb-5">
                    <span className="font-black text-xl text-indigo-600">{n}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            {...(mv ?? fadeUp())}
            className="rounded-3xl bg-white border border-gray-100 shadow-sm p-10 text-center"
          >
            <div className="flex justify-center mb-5">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="#FBBF24"
                  className="mx-0.5"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-xl font-semibold text-gray-900 leading-relaxed mb-6">
              &ldquo;Por fin tengo mis planeaciones listas el viernes — antes me quedaba hasta las
              11pm del domingo. MaestraAI entiende exactamente lo que necesito.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                A
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Alejandra M.</p>
                <p className="text-xs text-gray-400">Maestra de Kinder 3 · CDMX</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-20 px-4 bg-white">
        <motion.div {...(mv ?? fadeUp())} className="max-w-3xl mx-auto text-center">
          <div
            className="text-7xl text-indigo-100 font-serif leading-none mb-4 select-none"
            aria-hidden
          >
            &ldquo;
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-950 leading-snug">
            Que cada maestra tenga más tiempo para{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              enseñar
            </span>{' '}
            y menos para administrar.
          </p>
          <p className="mt-5 text-sm font-medium text-gray-400 uppercase tracking-widest">
            Nuestra misión
          </p>
        </motion.div>
      </section>

      {/* ── Dual CTA ── */}
      <section id="para-quien" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div {...(mv ?? fadeUp())} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mb-3">¿Quién eres tú?</h2>
            <p className="text-gray-500">
              Elige tu cuenta y empieza hoy. Gratis, sin tarjeta de crédito.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Teacher */}
            <motion.div
              {...(mv ?? fadeUp(0.05))}
              className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/80 p-8 flex flex-col"
            >
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                  Para maestras
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-2 mb-2">Cuenta individual</h3>
                <p className="text-gray-500 text-sm">
                  Regístrate sola y empieza a crear planeaciones para tu grupo en minutos.
                </p>
              </div>
              <div className="space-y-2.5 mb-8 flex-1">
                {[
                  'Planeaciones quincenales y talleres',
                  'Materiales didácticos con IA',
                  'Diario semanal de observaciones',
                  'Exportación en Word y PDF',
                  'Integración Richmond LP',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle2 size={15} className="text-indigo-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Link
                href="/register?type=teacher"
                className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 cursor-pointer"
              >
                Comenzar gratis
              </Link>
            </motion.div>

            {/* School admin */}
            <motion.div
              {...(mv ?? fadeUp(0.12))}
              className="rounded-3xl border-2 border-gray-200 bg-white p-8 flex flex-col"
            >
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Para escuelas
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-2 mb-2">
                  Cuenta institucional
                </h3>
                <p className="text-gray-500 text-sm">
                  Crea una cuenta para tu escuela, gestiona maestras e invita a tu equipo.
                </p>
              </div>
              <div className="space-y-2.5 mb-8 flex-1">
                {[
                  'Todo lo de la cuenta individual',
                  'Gestión de múltiples maestras',
                  'Anuncios y recursos compartidos',
                  'Panel de seguimiento escolar',
                  'Coordinación entre grupos',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Link
                href="/register?type=school"
                className="w-full text-center bg-gray-950 hover:bg-gray-800 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                Crear cuenta institucional
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-10 px-4 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="font-bold text-gray-900">MaestraAI</span>
            <span className="text-xs text-gray-400">Hecho con ♥ para maestras de México</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <Link
              href="/privacidad"
              className="hover:text-gray-600 transition-colors cursor-pointer"
            >
              Aviso de Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-gray-600 transition-colors cursor-pointer">
              Términos de Servicio
            </Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors cursor-pointer">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
