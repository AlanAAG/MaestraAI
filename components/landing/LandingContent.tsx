'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  useInView,
  type HTMLMotionProps,
} from 'framer-motion'

type MP = Partial<
  Pick<HTMLMotionProps<'div'>, 'initial' | 'whileInView' | 'viewport' | 'transition'>
>
import {
  ArrowRight,
  Sparkles,
  Link2,
  CheckCircle2,
  GraduationCap,
  CreditCard,
  Grid3X3,
  Target,
  Type,
  FileText,
  Play,
} from 'lucide-react'

// ── Motion preset ─────────────────────────────────────────────────────────────

const EASE = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, delay, ease: EASE },
  }
}

// ── Animated counter ──────────────────────────────────────────────────────────

function useCountUp(target: number, inView: boolean, duration = 1.8) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const timer = setInterval(() => {
      const p = Math.min((Date.now() - start) / (duration * 1000), 1)
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])
  return count
}

// ── Character placeholder ─────────────────────────────────────────────────────
// Swap this component's content with <img> once character assets are ready

function CharacterAvatar({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'xl'
  className?: string
}) {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    xl: 'w-52 h-52',
  }
  return (
    <div
      className={`${sizes[size]} ${className} rounded-full border-2 border-dashed border-violet-400/60 bg-violet-500/10 flex items-center justify-center shrink-0 ring-4 ring-violet-500/20 relative`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(139,92,246,0.2) 0%, transparent 70%)',
        }}
      />
      <span className="text-violet-300/70 font-medium text-center leading-tight px-2 select-none text-[10px]">
        Personaje
      </span>
    </div>
  )
}

// ── Inline UI mock-ups for timeline ──────────────────────────────────────────

function PlannerVisual() {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const fills = [
    'from-indigo-600 to-violet-600',
    null,
    'from-violet-600 to-purple-600',
    null,
    'from-sky-600 to-indigo-600',
  ]
  return (
    <div className="w-full max-w-sm rounded-2xl bg-[#1a1728] border border-white/10 p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
          Quincena — Kinder 3
        </span>
        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
          SEP 2024
        </span>
      </div>
      <div className="space-y-2">
        {days.map((day, i) => (
          <div key={day} className="flex items-center gap-3">
            <span className="text-white/30 text-[10px] w-16 shrink-0">{day}</span>
            <div
              className={`flex-1 h-7 rounded-lg ${fills[i] ? `bg-gradient-to-r ${fills[i]}` : 'bg-white/5 border border-white/5'} flex items-center px-3`}
            >
              {fills[i] && (
                <span className="text-white/70 text-[9px] font-medium truncate">
                  {
                    [
                      'Honores + Proyecto mensual',
                      '',
                      'Ed. Física + Proyecto',
                      '',
                      'Cierre · Cuento con papás',
                    ][i]
                  }
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MaterialsVisual() {
  const types = [
    { name: 'Flashcards', Icon: CreditCard, color: '#6366f1' },
    { name: 'Memorama', Icon: Grid3X3, color: '#8b5cf6' },
    { name: 'Bingo', Icon: Target, color: '#06b6d4' },
    { name: 'Sopa de letras', Icon: Type, color: '#10b981' },
    { name: 'Hojas de trabajo', Icon: FileText, color: '#f59e0b' },
    { name: 'YouTube', Icon: Play, color: '#ef4444' },
  ]
  return (
    <div className="w-full max-w-sm grid grid-cols-3 gap-2">
      {types.map(({ name, Icon, color }) => (
        <div
          key={name}
          className="rounded-xl border border-white/10 bg-[#1a1728] p-3 flex flex-col items-center gap-2"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}22` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-white/50 text-[9px] font-medium text-center leading-tight">
            {name}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProgressVisual() {
  const students = [
    { name: 'Sofía R.', label: 'Logrado', pct: 85, color: '#10b981' },
    { name: 'Mateo L.', label: 'En proceso', pct: 60, color: '#f59e0b' },
    { name: 'Valeria M.', label: 'Logrado', pct: 78, color: '#10b981' },
    { name: 'Diego P.', label: 'Requiere apoyo', pct: 32, color: '#ef4444' },
  ]
  return (
    <div className="w-full max-w-sm rounded-2xl bg-[#1a1728] border border-white/10 p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
          Progreso — Trimestre 1
        </span>
        <span className="text-emerald-400 text-[10px] font-semibold">NEM ✓</span>
      </div>
      <div className="space-y-3">
        {students.map((s) => (
          <div key={s.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/70 text-xs font-medium">{s.name}</span>
              <span className="text-[10px] font-semibold" style={{ color: s.color }}>
                {s.label}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: s.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${s.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RichmondVisual() {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-[#1a1728] border border-white/10 p-5 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Link2 size={16} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-xs font-semibold">Richmond LP sincronizado</p>
          <p className="text-white/30 text-[10px]">Extensión de Chrome · sync automático</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      </div>
      <div className="space-y-2">
        {[
          { name: 'Sofía R.', unit: 'Unit 3', done: true },
          { name: 'Mateo L.', unit: 'Unit 3', done: false },
          { name: 'Valeria M.', unit: 'Unit 2', done: true },
          { name: 'Diego P.', unit: 'Unit 2', done: false },
        ].map((r) => (
          <div key={r.name} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-[9px] text-indigo-300 font-bold shrink-0">
              {r.name[0]}
            </div>
            <span className="text-white/60 text-xs flex-1">{r.name}</span>
            <span className="text-white/30 text-[10px]">{r.unit}</span>
            <span
              className={`text-[10px] font-semibold ${r.done ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {r.done ? 'Completado' : 'En progreso'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Timeline data ─────────────────────────────────────────────────────────────

const STOPS = [
  {
    badge: 'Planeación',
    accent: '#6366f1',
    title: 'Planeaciones completas en minutos',
    body: 'Genera quincenas y talleres con actividades, campos formativos, materiales y cronograma — alineados al Programa Sintético SEP 2024. La IA aprende tu formato escolar y tu horario de grupo.',
    Visual: PlannerVisual,
  },
  {
    badge: 'Materiales',
    accent: '#8b5cf6',
    title: 'Materiales didácticos listos para imprimir o proyectar',
    body: 'Flashcards, memoramas, sopas de letras, bingo, hojas de trabajo y más — generados automáticamente con el vocabulario de tu quincena. Un clic para exportar o proyectar en clase.',
    Visual: MaterialsVisual,
  },
  {
    badge: 'Seguimiento',
    accent: '#06b6d4',
    title: 'Observaciones y reportes cualitativos',
    body: 'Registra el avance de cada alumno y genera reportes trimestrales alineados al NEM — sin calificaciones numéricas, sin papelería extra. Todo guardado y organizado por quincena.',
    Visual: ProgressVisual,
  },
  {
    badge: 'Richmond LP',
    accent: '#10b981',
    title: 'Sincronización automática con Richmond',
    body: 'La extensión de Chrome captura las calificaciones de Richmond LP y las integra en tu plataforma. Cero copiar y pegar, cero Excel aparte.',
    Visual: RichmondVisual,
  },
]

// ── Timeline stop component ───────────────────────────────────────────────────

function TimelineStop({
  stop,
  index,
  reduced,
}: {
  stop: (typeof STOPS)[0]
  index: number
  reduced: boolean | null
}) {
  const isLeft = index % 2 === 0
  const { badge, accent, title, body, Visual } = stop

  const textMotion: MP = reduced
    ? {}
    : {
        initial: { opacity: 0, x: isLeft ? -40 : 40 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.65, ease: EASE },
      }

  const visualMotion: MP = reduced
    ? {}
    : {
        initial: { opacity: 0, x: isLeft ? 40 : -40 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.65, delay: 0.1, ease: EASE },
      }

  return (
    <div className="relative py-20 md:py-32">
      {/* Dot on the line */}
      <div
        aria-hidden
        className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full z-20"
        style={{
          backgroundColor: accent,
          boxShadow: `0 0 20px 6px ${accent}44, 0 0 0 4px ${accent}22`,
        }}
      />

      <div
        className={`flex flex-col ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-0 items-center`}
      >
        {/* Text */}
        <motion.div
          {...textMotion}
          className={`flex-1 ${isLeft ? 'md:pr-20 md:text-right' : 'md:pl-20'} px-4 md:px-0`}
        >
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            {badge}
          </span>
          <h3 className="text-2xl md:text-3xl font-black text-white leading-snug mb-4">{title}</h3>
          <p className="text-white/45 leading-relaxed text-sm md:text-base max-w-sm">{body}</p>
        </motion.div>

        {/* Spacer for the line */}
        <div className="hidden md:block w-20 shrink-0" />

        {/* Visual */}
        <motion.div
          {...visualMotion}
          className={`flex-1 flex ${isLeft ? 'md:justify-start' : 'md:justify-end'} px-4 md:px-0`}
        >
          <Visual />
        </motion.div>
      </div>
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  value,
  suffix = '',
  label,
  sublabel,
  accent,
  delay = 0,
}: {
  value: number
  suffix?: string
  label: string
  sublabel: string
  accent: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const count = useCountUp(value, inView)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay }}
      className="flex flex-col items-center text-center p-6 rounded-2xl border border-white/10 bg-white/5"
    >
      <span className="text-5xl md:text-6xl font-black mb-2 tabular-nums" style={{ color: accent }}>
        {count}
        {suffix}
      </span>
      <span className="text-white font-bold text-base">{label}</span>
      <span className="text-white/35 text-xs mt-1">{sublabel}</span>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LandingContent() {
  const reduced = useReducedMotion()

  // Scroll-driven timeline character
  const timelineRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ['start 85%', 'end 15%'],
  })
  const rawTop = useTransform(scrollYProgress, [0, 1], ['0%', '88%'])
  const charTop = useSpring(rawTop, { stiffness: 60, damping: 18 })

  return (
    <div className="min-h-screen text-white font-sans antialiased overflow-x-hidden">
      {/* ── Floating nav ── */}
      <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-4">
        <nav className="w-full max-w-5xl flex items-center justify-between px-5 h-14 rounded-2xl bg-[#0d0b14]/80 backdrop-blur-md border border-white/10 shadow-xl">
          <span className="font-black text-base text-white tracking-tight">MaestraIA</span>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/50 font-medium">
            <a href="#plataforma" className="hover:text-white transition-colors cursor-pointer">
              La plataforma
            </a>
            <a href="#para-quien" className="hover:text-white transition-colors cursor-pointer">
              Para quién
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2 cursor-pointer"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Empezar gratis
            </Link>
          </div>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center bg-[#0d0b14] overflow-hidden">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-indigo-600/20 blur-[140px]" />
          <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] rounded-full bg-sky-500/10 blur-[100px]" />
        </div>
        {/* Dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-28 pb-16 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left — text */}
            <div>
              <motion.div {...(reduced ? {} : fadeUp(0))}>
                <span className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide">
                  <Sparkles size={12} strokeWidth={2.5} />
                  Para maestras de inglés en preescolar · NEM + PRONI 2024
                </span>
              </motion.div>

              <motion.h1
                {...(reduced ? {} : fadeUp(0.08))}
                className="text-5xl sm:text-6xl font-black text-white leading-[1.06] tracking-tight"
              >
                Planea una quincena{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  en 30 minutos
                </span>{' '}
                — no en horas
              </motion.h1>

              <motion.p
                {...(reduced ? {} : fadeUp(0.16))}
                className="mt-6 text-lg text-white/50 leading-relaxed max-w-lg"
              >
                MaestraIA genera planeaciones alineadas al NEM y PRONI, crea materiales didácticos
                listos para imprimir, y da seguimiento a cada alumno — todo en un solo lugar.
              </motion.p>

              <motion.div
                {...(reduced ? {} : fadeUp(0.22))}
                className="mt-10 flex flex-col sm:flex-row gap-3"
              >
                <Link
                  href="/register?type=teacher"
                  className="group inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-2xl transition-all duration-200 shadow-lg shadow-indigo-900/60 hover:-translate-y-0.5 cursor-pointer"
                >
                  Soy maestra
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
                <Link
                  href="/register?type=school"
                  className="inline-flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold px-7 py-3.5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  Soy directora / admin escolar
                </Link>
              </motion.div>

              <motion.div {...(reduced ? {} : fadeUp(0.3))} className="mt-8 flex flex-wrap gap-3">
                {['< 30 min por planeación', 'NEM · SEP 2024', 'Compatible con Richmond LP'].map(
                  (s) => (
                    <span
                      key={s}
                      className="bg-white/8 border border-white/10 text-white/45 text-xs font-medium px-4 py-2 rounded-full"
                    >
                      {s}
                    </span>
                  )
                )}
              </motion.div>
            </div>

            {/* Right — character + speech bubble */}
            <motion.div
              {...(reduced
                ? {}
                : {
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    transition: { duration: 0.7, delay: 0.3 },
                  })}
              className="hidden md:flex flex-col items-center justify-center relative min-h-[420px]"
            >
              {/* Floating speech bubble */}
              <motion.div
                animate={reduced ? {} : { y: [0, -10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-4 left-4 right-16 flex justify-center"
              >
                <div className="bg-white text-gray-800 text-sm font-semibold px-5 py-3 rounded-2xl rounded-bl-sm shadow-xl max-w-[240px] text-center relative">
                  ¡Hola! Te ayudo a planear tu quincena en minutos.
                  <div className="absolute -bottom-2.5 left-6 w-5 h-5 bg-white rotate-45 rounded-sm" />
                </div>
              </motion.div>

              {/* Character placeholder — REPLACE with <img> when asset is ready */}
              <div className="mt-20 flex flex-col items-center gap-3">
                <div className="w-56 h-56 rounded-3xl border-2 border-dashed border-violet-400/40 bg-violet-500/8 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 30%, rgba(99,102,241,0.2) 0%, transparent 65%)',
                    }}
                  />
                  <GraduationCap size={44} className="text-violet-400/40" />
                  <div className="text-center">
                    <p className="text-violet-300/60 text-sm font-semibold">Personaje MaestraIA</p>
                    <p className="text-violet-400/30 text-xs mt-0.5">Asset pendiente</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="bg-white border-y border-gray-100 py-5 px-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
            Alineado con
          </span>
          {[
            'Programa Sintético Fase 2, SEP 2024',
            'PRONI',
            '4 Campos Formativos',
            'Richmond LP',
          ].map((t) => (
            <span key={t} className="text-sm font-bold text-gray-700 whitespace-nowrap">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Timeline section ── */}
      <section id="plataforma" className="bg-[#0d0b14] py-24 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <motion.div {...(reduced ? {} : fadeUp())} className="text-center mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-4 block">
              La plataforma
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Todo lo que necesitas para enseñar mejor
            </h2>
            <p className="text-white/35 max-w-lg mx-auto">
              Desde la planeación hasta el reporte trimestral, MaestraIA cubre cada etapa de tu
              semana.
            </p>
          </motion.div>

          {/* Scroll-driven timeline */}
          <div ref={timelineRef} className="relative mt-20">
            {/* Vertical gradient line */}
            <div
              aria-hidden
              className="hidden md:block absolute left-1/2 -translate-x-px top-0 bottom-0 w-px"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 0%, #6366f1 6%, #8b5cf6 40%, #06b6d4 75%, #10b981 94%, transparent 100%)',
              }}
            />

            {/* Scroll-progress fill overlay */}
            <motion.div
              aria-hidden
              className="hidden md:block absolute left-1/2 -translate-x-px top-0 w-px bg-white/20 origin-top"
              style={{ scaleY: scrollYProgress, height: '100%' }}
            />

            {/* Moving character avatar on the line */}
            {!reduced && (
              <motion.div
                aria-hidden
                className="hidden md:block absolute z-30 pointer-events-none"
                style={{ left: 'calc(50% - 24px)', top: charTop }}
              >
                <CharacterAvatar size="sm" />
              </motion.div>
            )}

            {/* Timeline stops */}
            {STOPS.map((stop, i) => (
              <TimelineStop key={i} stop={stop} index={i} reduced={reduced} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="bg-[#13111c] py-24 px-4 border-t border-white/5">
        <motion.div {...(reduced ? {} : fadeUp())} className="text-center mb-14">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-4 block">
            Por qué MaestraIA
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Hecho específicamente para
            <br className="hidden sm:block" /> maestras de preescolar en México
          </h2>
        </motion.div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            value={30}
            suffix=" min"
            label="Por planeación"
            sublabel="vs horas manuales"
            accent="#6366f1"
            delay={0}
          />
          <MetricCard
            value={10}
            suffix=" días"
            label="Por quincena"
            sublabel="cubiertos en 1 clic"
            accent="#8b5cf6"
            delay={0.08}
          />
          <MetricCard
            value={6}
            suffix="+"
            label="Tipos de materiales"
            sublabel="imprimir o proyectar"
            accent="#06b6d4"
            delay={0.16}
          />
          <MetricCard
            value={100}
            suffix="%"
            label="Alineación NEM"
            sublabel="SEP 2024 + PRONI"
            accent="#10b981"
            delay={0.24}
          />
        </div>
      </section>

      {/* ── Before / After ── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div {...(reduced ? {} : fadeUp())} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mb-3">
              Antes vs. con MaestraIA
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Así cambia tu semana cuando la planificación deja de ser el problema.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-5">
            <motion.div
              {...(reduced ? {} : fadeUp(0.05))}
              className="rounded-3xl border border-gray-200 bg-gray-50 p-8"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 block">
                Antes
              </span>
              <div className="space-y-5">
                {[
                  '4 horas el domingo planificando',
                  'Buscar el formato correcto cada quincena',
                  'Calificaciones en Excel por separado',
                  'Sin tiempo para preparar materiales',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-4">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-gray-400 text-[10px] font-bold leading-none">✕</span>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed line-through decoration-gray-300">
                      {t}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              {...(reduced ? {} : fadeUp(0.12))}
              className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-8 relative overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/30 rounded-full blur-2xl"
              />
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-6 block">
                Con MaestraIA
              </span>
              <div className="space-y-5">
                {[
                  'Plan completo en 30 minutos',
                  'Tu formato, tu escuela, cada vez',
                  'Richmond sincronizado automáticamente',
                  'Materiales generados en automático',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-4">
                    <CheckCircle2 size={20} className="text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-gray-800 text-sm leading-relaxed font-medium">{t}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <motion.div
            {...(reduced ? {} : fadeUp())}
            className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center"
          >
            <div className="flex justify-center gap-0.5 mb-5">
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#FBBF24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-xl font-semibold text-gray-900 leading-relaxed mb-6">
              &ldquo;Por fin tengo mis planeaciones listas el viernes — antes me quedaba hasta las
              11pm del domingo. MaestraIA entiende exactamente lo que necesito.&rdquo;
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

      {/* ── Dual CTA ── */}
      <section id="para-quien" className="py-24 px-4 bg-[#0d0b14]">
        <div className="max-w-4xl mx-auto">
          <motion.div {...(reduced ? {} : fadeUp())} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">¿Quién eres tú?</h2>
            <p className="text-white/35">
              Elige tu cuenta y empieza hoy. Gratis, sin tarjeta de crédito.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Teacher */}
            <motion.div
              {...(reduced ? {} : fadeUp(0.05))}
              className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-8 flex flex-col"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
                Para maestras
              </span>
              <h3 className="text-2xl font-black text-white mt-1 mb-2">Cuenta individual</h3>
              <p className="text-white/40 text-sm mb-6">
                Regístrate sola y empieza a crear planeaciones para tu grupo en minutos.
              </p>
              <div className="space-y-2.5 mb-8 flex-1">
                {[
                  'Planeaciones quincenales y talleres',
                  'Materiales didácticos con IA',
                  'Diario semanal de observaciones',
                  'Exportación en Word y PDF',
                  'Integración Richmond LP',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-white/65">
                    <CheckCircle2 size={15} className="text-indigo-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Link
                href="/register?type=teacher"
                className="w-full text-center block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-indigo-900/50 cursor-pointer"
              >
                Comenzar gratis
              </Link>
            </motion.div>

            {/* School */}
            <motion.div
              {...(reduced ? {} : fadeUp(0.12))}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
                Para escuelas
              </span>
              <h3 className="text-2xl font-black text-white mt-1 mb-2">Cuenta institucional</h3>
              <p className="text-white/40 text-sm mb-6">
                Crea una cuenta para tu escuela, gestiona maestras e invita a tu equipo.
              </p>
              <div className="space-y-2.5 mb-8 flex-1">
                {[
                  'Todo lo de la cuenta individual',
                  'Gestión de múltiples maestras',
                  'Anuncios y recursos compartidos',
                  'Panel de seguimiento escolar',
                  'Coordinación entre grupos',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-white/65">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Link
                href="/register?type=school"
                className="w-full text-center block bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                Crear cuenta institucional
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 py-10 px-4 bg-[#0d0b14]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="font-black text-white">MaestraIA</span>
            <span className="text-xs text-white/25">Hecho para maestras de México</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/30">
            <Link
              href="/privacidad"
              className="hover:text-white/60 transition-colors cursor-pointer"
            >
              Aviso de Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-white/60 transition-colors cursor-pointer">
              Términos de Servicio
            </Link>
            <Link href="/login" className="hover:text-white/60 transition-colors cursor-pointer">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Fixed floating character (bottom-right corner) ── */}
      {/* Replace CharacterAvatar with <img> when asset is ready */}
      <motion.div
        className="fixed bottom-6 right-6 z-40 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.5 }}
      >
        <CharacterAvatar size="sm" />
      </motion.div>
    </div>
  )
}
