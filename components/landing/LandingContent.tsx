'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useTransform,
  type HTMLMotionProps,
} from 'framer-motion'
import { ReactLenis } from 'lenis/react'
import { celebrateWarm } from '@/lib/ui/celebrate'
import { track } from './Analytics'
import LottieAccent from './LottieAccent'

type MP = Partial<
  Pick<HTMLMotionProps<'div'>, 'initial' | 'whileInView' | 'viewport' | 'transition'>
>
import {
  ArrowRight,
  Link2,
  CheckCircle2,
  CreditCard,
  Grid3X3,
  Target,
  Type,
  Play,
  Puzzle,
  Ear,
  Shapes,
  FileText,
  Download,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'

// ── Motion presets (varied per section so the scroll doesn't feel repetitive) ─

const EASE = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]

function fadeUp(delay = 0): MP {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, delay, ease: EASE },
  }
}

function slideIn(fromX: number, delay = 0): MP {
  return {
    initial: { opacity: 0, x: fromX },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.65, delay, ease: EASE },
  }
}

function popIn(delay = 0): MP {
  return {
    initial: { opacity: 0, scale: 0.94, y: 16 },
    whileInView: { opacity: 1, scale: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.5, delay, ease: EASE },
  }
}

function scrollToWaitlist() {
  document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// Word-stagger headline reveal (the "SplitText" effect, no GSAP needed).
function StaggerTitle({
  text,
  className,
  reduced,
}: {
  text: string
  className?: string
  reduced: boolean | null
}) {
  if (reduced) return <h2 className={className}>{text}</h2>
  const words = text.split(' ')
  return (
    <motion.h2
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ show: { transition: { staggerChildren: 0.055 } } }}
      aria-label={text}
    >
      {words.map((w, i) => (
        // The space lives OUTSIDE the inline-block span — inside it collapses and glues words.
        <span key={i}>
          <motion.span
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: '0.55em' },
              show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
            }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </motion.h2>
  )
}

// Scroll-scrub parallax: the wrapped element drifts slower than the page while in view.
function Drift({
  children,
  distance = 36,
  reduced,
  className = '',
}: {
  children: React.ReactNode
  distance?: number
  reduced: boolean | null
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance])
  return (
    <motion.div ref={ref} style={reduced ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  )
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

// ── Star motif (line art, brand gold, max 3 per screen) ───────────────────────

function Star({
  size = 16,
  filled = false,
  className = '',
}: {
  size?: number
  filled?: boolean
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z" />
    </svg>
  )
}

// ── Mascot placeholder (La Maestra: bun + round glasses, line art) ────────────
// PLACEHOLDER: swap this SVG for the real La Maestra illustration when the
// asset is ready. Keep the container dimensions.

function MascotPlaceholder({ size = 160 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="text-brand"
      aria-hidden
    >
      {/* bun */}
      <circle cx="60" cy="20" r="9" fill="#FDF3E4" />
      {/* head */}
      <circle cx="60" cy="64" r="34" fill="#FDF3E4" />
      {/* round glasses, the signature element */}
      <circle cx="47" cy="60" r="9" fill="#FFFFFF" />
      <circle cx="73" cy="60" r="9" fill="#FFFFFF" />
      <path d="M56 60h8" />
      {/* smile */}
      <path d="M51 79c3.5 3.5 14.5 3.5 18 0" />
    </svg>
  )
}

function CharacterAvatar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-12 h-12 rounded-full border border-border bg-brand-subtle flex items-center justify-center shrink-0 shadow-md ${className}`}
    >
      <MascotPlaceholder size={36} />
    </div>
  )
}

// ── Waitlist capture form (the conversion element) ───────────────────────────

const GRADES = ['Kinder 1', 'Kinder 2', 'Kinder 3', 'Directora', 'Otro']

function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [grade, setGrade] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ position: number; ref_code: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [ref, setRef] = useState<string | undefined>()

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('ref')
    if (r) setRef(r)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return setError('Escribe tu correo')
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), grade: grade || undefined, ref }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'No pude registrarte')
      setDone({ position: d.position, ref_code: d.ref_code })
      track('waitlist_submit', { grade: grade || 'sin_grado', referred: Boolean(ref) })
      celebrateWarm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border-2 border-brand bg-card p-6 text-center max-w-md"
      >
        <LottieAccent src="/lottie/success.json" className="mx-auto h-16 w-16" loop={false} />
        <div className="flex justify-center mb-2">
          <span className="inline-flex w-11 h-11 items-center justify-center rounded-full bg-brand-subtle text-brand">
            <Star size={20} filled />
          </span>
        </div>
        <h3 className="font-display text-lg font-semibold text-text-primary">
          Ya estás en la lista
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Estás en el lugar <strong className="font-medium text-brand">#{done.position}</strong>. Te
          avisamos cuando sea tu turno.
        </p>
        <p className="mt-4 text-xs text-text-muted">Comparte con tus colegas y sube de posición:</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/?ref=${done.ref_code}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="mt-2 w-full truncate rounded-sm border border-border-strong bg-inset px-3 py-2.5 text-sm text-brand hover:bg-brand-subtle transition-colors cursor-pointer"
        >
          {copied ? 'Enlace copiado' : `${window.location.origin}/?ref=${done.ref_code}`}
        </button>
        <div className="mt-4 space-y-1 text-left text-xs text-text-muted">
          <p>Invita 3 colegas = acceso prioritario</p>
          <p>Invita 5 colegas = primera ola + plantilla premium gratis</p>
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          placeholder="tu@correo.com"
          required
          className="w-full rounded-sm border border-border bg-card px-4 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-subtle"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="flex-1 rounded-sm border border-border bg-card px-4 py-3.5 text-base text-text-secondary focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-subtle"
          >
            <option value="">¿Qué grado enseñas?</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-display font-medium text-sm px-6 py-3.5 rounded-sm transition-colors active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {submitting && <Loader2 size={17} className="animate-spin" />}
            Reservar mi lugar
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
        <Lock size={12} className="shrink-0" /> Gratis, sin tarjeta. Tu correo nunca se comparte.
      </p>
    </form>
  )
}

// ── Inline UI mock-ups (light, warm palette) ──────────────────────────────────

function PlannerVisual() {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const labels = [
    'Honores + Proyecto mensual',
    '',
    'Ed. Física + Proyecto',
    '',
    'Cierre · Cuento con papás',
  ]
  return (
    <div className="w-full max-w-sm rounded-lg bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-text-muted text-[10px] font-medium">Quincena · Kinder 3</span>
        <span className="text-[10px] bg-brand-subtle text-brand px-2 py-0.5 rounded-full font-medium">
          SEP 2024
        </span>
      </div>
      <div className="space-y-2">
        {days.map((day, i) => (
          <div key={day} className="flex items-center gap-3">
            <span className="text-text-muted text-[10px] w-16 shrink-0">{day}</span>
            <div
              className={`flex-1 h-7 rounded-md ${labels[i] ? 'bg-brand-subtle' : 'bg-inset'} flex items-center px-3`}
            >
              {labels[i] && (
                <span className="text-text-secondary text-[9px] font-medium truncate">
                  {labels[i]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md bg-inset px-3 py-2">
        <FileText size={13} className="text-brand shrink-0" />
        <span className="text-text-muted text-[10px]">
          PDAs textuales · Programa Sintético Fase 2 · 4 campos formativos
        </span>
      </div>
    </div>
  )
}

function MaterialsVisual() {
  const types = [
    { name: 'Flashcards', Icon: CreditCard },
    { name: 'Memorama', Icon: Grid3X3 },
    { name: 'Bingo', Icon: Target },
    { name: 'Sopa de letras', Icon: Type },
    { name: 'Clasificar', Icon: Shapes },
    { name: '¿Cuál es la palabra?', Icon: Puzzle },
    { name: 'Escucha y toca', Icon: Ear },
    { name: 'Videos', Icon: Play },
  ]
  return (
    <div className="w-full max-w-sm">
      <div className="grid grid-cols-4 gap-2">
        {types.map(({ name, Icon }) => (
          <div
            key={name}
            className="rounded-lg border border-border bg-card p-2.5 flex flex-col items-center gap-1.5"
          >
            <div className="w-8 h-8 rounded-md bg-brand-subtle flex items-center justify-center">
              <Icon size={15} className="text-brand" />
            </div>
            <span className="text-text-secondary text-[8px] font-medium text-center leading-tight">
              {name}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
        <Link2 size={13} className="text-brand shrink-0" />
        <span className="text-text-muted text-[10px] flex-1">maestraia.com/jugar/ab3x…</span>
        <span className="text-[9px] bg-success-light text-success-text px-2 py-0.5 rounded-full font-medium">
          Para jugar en casa
        </span>
      </div>
    </div>
  )
}

function DiaryVisual() {
  return (
    <div className="w-full max-w-sm rounded-lg bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-text-muted text-[10px] font-medium">Diario de la educadora</span>
        <span className="text-[10px] bg-brand-subtle text-brand px-2 py-0.5 rounded-full font-medium">
          Viernes
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ${
                n < 5 ? 'bg-brand-subtle text-brand' : 'bg-brand text-white'
              }`}
            >
              {n}
            </div>
            {n < 5 && <div className="h-px w-full bg-border" />}
          </div>
        ))}
      </div>
      <div className="rounded-md bg-inset p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Star size={11} className="text-brand" />
          <span className="text-brand text-[10px] font-medium">Resumen con IA</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-border w-full" />
          <div className="h-1.5 rounded-full bg-border w-11/12" />
          <div className="h-1.5 rounded-full bg-border w-4/5" />
        </div>
      </div>
      <div className="flex gap-2">
        <span className="flex-1 text-center text-[10px] font-medium text-text-secondary bg-inset rounded-md py-2">
          Descargar PDF
        </span>
        <span className="flex-1 text-center text-[10px] font-medium text-text-secondary bg-inset rounded-md py-2">
          Compartir con mi escuela
        </span>
      </div>
    </div>
  )
}

// ── Gentle infinite float (keeps the page alive at rest) ──────────────────────

function Float({
  children,
  reduced,
  distance = 10,
  duration = 4,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  reduced: boolean | null
  distance?: number
  duration?: number
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      animate={reduced ? {} : { y: [0, -distance, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {children}
    </motion.div>
  )
}

// ── Feature chip (icon + 1-2 words, replaces bullet paragraphs) ───────────────

function Chip({ Icon, label }: { Icon: typeof CheckCircle2; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-3 py-1.5 text-xs font-medium text-brand">
      <Icon size={13} className="shrink-0" />
      {label}
    </span>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  value,
  suffix = '',
  label,
  sublabel,
  delay = 0,
}: {
  value: number
  suffix?: string
  label: string
  sublabel: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const count = useCountUp(value, inView)

  return (
    <motion.div
      ref={ref}
      {...popIn(delay)}
      className="flex flex-col items-center text-center p-6 rounded-lg border border-border bg-card"
    >
      <span className="font-display text-4xl md:text-5xl font-semibold mb-2 tabular-nums text-brand">
        {count}
        {suffix}
      </span>
      <span className="text-text-primary font-medium text-sm md:text-base">{label}</span>
      <span className="text-text-muted text-xs mt-1">{sublabel}</span>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

// Add the 2-3 pending quotes here (see docs/PROGRESS.md pending-assets) — dots appear at >1.
const TESTIMONIALS = [
  {
    quote: 'Por fin tengo mis planeaciones listas el viernes.',
    name: 'Alejandra M.',
    role: 'Kinder 3 · CDMX',
  },
]

function TestimonialCarousel({ reduced }: { reduced: boolean | null }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <motion.div {...(reduced ? {} : popIn())}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className={
          TESTIMONIALS.length > 1
            ? 'flex snap-x snap-mandatory overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : ''
        }
      >
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="w-full shrink-0 snap-center text-center px-1">
            <div className="flex justify-center mb-5 text-brand">
              <Star size={20} filled />
            </div>
            <blockquote className="font-display text-2xl md:text-3xl font-medium text-text-primary leading-snug mb-6">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center text-brand font-medium text-sm">
                {t.name[0]}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary">{t.name}</p>
                <p className="text-xs text-text-muted">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {TESTIMONIALS.length > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              aria-label={`Testimonio ${i + 1}`}
              onClick={() =>
                trackRef.current?.scrollTo({
                  left: i * (trackRef.current?.clientWidth ?? 0),
                  behavior: 'smooth',
                })
              }
              className={`h-2 rounded-full transition-all cursor-pointer ${
                i === active ? 'w-5 bg-brand' : 'w-2 bg-border-strong hover:bg-brand-light'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

const TRUST_ITEMS = [
  { Icon: Star, label: 'NEM · SEP 2024' },
  { Icon: CheckCircle2, label: 'Evaluación cualitativa' },
  { Icon: Lock, label: 'Datos protegidos · LFPDPPP' },
  { Icon: ShieldCheck, label: 'Nombres cifrados' },
]

export default function LandingContent() {
  const reduced = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  // Subtle parallax on the hero visual cluster (depth as you scroll away).
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120])
  // Hero exit: content gently fades/shrinks as you scroll into the page.
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.25])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.965])

  const page = (
    <div className="min-h-screen bg-page text-text-primary font-sans antialiased overflow-x-hidden">
      {/* ── Floating nav ── */}
      <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-4">
        <nav className="w-full max-w-5xl flex items-center justify-between px-5 h-14 rounded-lg bg-card/90 backdrop-blur-md border border-border shadow-md">
          <span className="font-display font-semibold text-base text-text-primary tracking-tight">
            MaestraIA
          </span>
          <div className="hidden md:flex items-center gap-6 text-sm text-text-secondary font-medium">
            <a
              href="#plataforma"
              className="hover:text-text-primary transition-colors cursor-pointer"
            >
              La plataforma
            </a>
            <a
              href="#como-funciona"
              className="hover:text-text-primary transition-colors cursor-pointer"
            >
              Cómo funciona
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2 cursor-pointer"
            >
              Entrar
            </Link>
            {/* Secondary on purpose: the hero waitlist button is the one primary in view */}
            <button
              onClick={scrollToWaitlist}
              className="text-sm font-display font-medium text-text-secondary border border-border-strong hover:bg-inset px-4 py-2 rounded-sm transition-colors active:scale-[0.98] cursor-pointer min-h-[40px]"
            >
              Reservar lugar
            </button>
          </div>
        </nav>
      </div>

      {/* ── 1 · Hero — big promise, few words, floating visuals + parallax ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center bg-page overflow-hidden"
      >
        <Star
          size={22}
          className="text-brand-light absolute top-[16%] right-[10%] hidden md:block"
        />
        <Star
          size={14}
          filled
          className="text-brand-light absolute bottom-[20%] left-[6%] hidden md:block"
        />

        <motion.div
          style={reduced ? undefined : { opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-6xl mx-auto px-4 pt-28 pb-16 w-full"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left — promise + waitlist */}
            <div>
              <motion.div {...(reduced ? {} : fadeUp(0))}>
                <span className="inline-flex items-center gap-1.5 bg-brand-subtle text-brand text-xs font-medium px-4 py-1.5 rounded-full mb-8">
                  <Star size={12} filled />
                  Para maestras de preescolar · NEM 2024
                </span>
              </motion.div>

              <motion.h1
                {...(reduced ? {} : fadeUp(0.08))}
                className="font-display text-5xl lg:text-6xl font-semibold text-text-primary leading-[1.05] tracking-tight"
              >
                Recupera <span className="text-brand">tus domingos.</span>
              </motion.h1>

              <motion.p
                {...(reduced ? {} : fadeUp(0.16))}
                className="mt-5 text-lg text-text-secondary max-w-md"
              >
                Tu quincena, planeada en 10 minutos.
              </motion.p>

              <motion.div {...(reduced ? {} : fadeUp(0.24))} className="mt-9" id="waitlist">
                <WaitlistForm />
              </motion.div>

              <motion.div {...(reduced ? {} : fadeUp(0.3))} className="mt-5">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-brand transition-colors cursor-pointer py-2"
                >
                  Ya tengo cuenta <ArrowRight size={14} />
                </Link>
              </motion.div>
            </div>

            {/* Right — floating mascot + product-card cluster, with scroll parallax */}
            <motion.div
              style={reduced ? undefined : { y: heroY }}
              className="hidden md:flex items-center justify-center relative min-h-[460px]"
            >
              <Float reduced={reduced} distance={12} duration={5}>
                <div className="w-52 h-52 rounded-full bg-brand-subtle border border-border flex items-center justify-center shadow-lg">
                  <MascotPlaceholder size={156} />
                </div>
              </Float>
              {/* Drop a brand animation at public/lottie/hero.json and this lights up */}
              <LottieAccent
                src="/lottie/hero.json"
                className="absolute -top-6 right-2 w-24 pointer-events-none"
              />

              <Float
                reduced={reduced}
                distance={9}
                duration={4}
                className="absolute -top-2 -left-2 w-44"
              >
                <div className="rounded-lg bg-card border border-border shadow-lg p-3 scale-[0.85] origin-top-left">
                  <PlannerVisual />
                </div>
              </Float>

              <Float
                reduced={reduced}
                distance={11}
                duration={4.6}
                delay={0.6}
                className="absolute bottom-0 -right-2 w-44"
              >
                <div className="rounded-lg bg-card border border-border shadow-lg p-3 scale-[0.85] origin-bottom-right">
                  <MaterialsVisual />
                </div>
              </Float>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── 2 · Stats band — big numbers, tiny labels ── */}
      <section className="bg-card border-y border-border py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            value={10}
            suffix=" min"
            label="Por planeación"
            sublabel="antes: 4 horas"
            delay={0}
          />
          <MetricCard
            value={8}
            suffix="+"
            label="Juegos y materiales"
            sublabel="listos al instante"
            delay={0.08}
          />
          <MetricCard value={4} label="Campos formativos" sublabel="PDAs textuales" delay={0.16} />
          <MetricCard
            value={100}
            suffix="%"
            label="Evaluación cualitativa"
            sublabel="nunca números"
            delay={0.24}
          />
        </div>
      </section>

      {/* ── 3 · "Todo tu trabajo, en un lugar" — 3 big visuals, one line each ── */}
      <section id="plataforma" className="bg-page py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <StaggerTitle
            text="Todo tu trabajo, en un lugar."
            reduced={reduced}
            className="font-display text-3xl md:text-4xl font-semibold text-text-primary text-center mb-14"
          />
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { V: PlannerVisual, t: 'Planeaciones NEM', d: 'Con tu formato, en tu voz.' },
              {
                V: MaterialsVisual,
                t: 'Juegos y materiales',
                d: 'Listos para proyectar o jugar en casa.',
              },
              {
                V: DiaryVisual,
                t: 'Diario de la educadora',
                d: 'Redactado por ti, resumido por la IA.',
              },
            ].map(({ V, t, d }) => (
              <motion.div
                key={t}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                }}
                className="flex flex-col items-center text-center gap-5"
              >
                <Float reduced={reduced} distance={7} duration={4.5}>
                  <div className="rounded-lg bg-card border border-border shadow-md p-4">
                    <V />
                  </div>
                </Float>
                <div>
                  <h3 className="font-display text-lg font-medium text-text-primary">{t}</h3>
                  <p className="text-sm text-text-secondary mt-1">{d}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 4 · Spotlight: Planeaciones — large visual slides in + chips ── */}
      <section className="bg-inset py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <motion.div {...(reduced ? {} : fadeUp())} className="flex-1">
            <StaggerTitle
              text="Habla NEM de verdad."
              reduced={reduced}
              className="font-display text-3xl md:text-4xl font-semibold text-text-primary leading-tight"
            />
            <p className="mt-4 text-text-secondary max-w-md">
              PDAs oficiales, citados textualmente. Nada que tu directora vaya a tachar.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Chip Icon={CheckCircle2} label="PDAs verbatim" />
              <Chip Icon={FileText} label="Tu formato" />
              <Chip Icon={ShieldCheck} label="Fichero de la Paz" />
              <Chip Icon={Download} label="Word y PDF" />
            </div>
          </motion.div>
          <motion.div
            {...(reduced ? {} : slideIn(56, 0.1))}
            className="flex-1 flex justify-center md:justify-end w-full"
          >
            <Drift reduced={reduced} distance={32}>
              <Float reduced={reduced} distance={9} duration={5}>
                <div className="rounded-lg bg-card border border-border shadow-lg p-4 md:scale-110">
                  <PlannerVisual />
                </div>
              </Float>
            </Drift>
          </motion.div>
        </div>
      </section>

      {/* ── 5 · Spotlight: Materiales — playful visual floats ── */}
      <section className="bg-page py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row-reverse items-center gap-12">
          <motion.div {...(reduced ? {} : fadeUp())} className="flex-1">
            <StaggerTitle
              text="Juegos, en un clic."
              reduced={reduced}
              className="font-display text-3xl md:text-4xl font-semibold text-text-primary leading-tight"
            />
            <p className="mt-4 text-text-secondary max-w-md">
              Con el vocabulario de tu quincena. Para peques que aún no leen.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Chip Icon={Play} label="Proyéctalos en clase" />
              <Chip Icon={Link2} label="Comparte con un enlace" />
              <Chip Icon={Ear} label="Con imagen y audio" />
            </div>
          </motion.div>
          <motion.div
            {...(reduced ? {} : slideIn(-56, 0.1))}
            className="flex-1 flex justify-center md:justify-start w-full"
          >
            <Drift reduced={reduced} distance={32}>
              <Float reduced={reduced} distance={11} duration={4.4}>
                <div className="rounded-lg bg-card border border-border shadow-lg p-4 md:scale-110">
                  <MaterialsVisual />
                </div>
              </Float>
            </Drift>
          </motion.div>
        </div>
      </section>

      {/* ── 6 · Trust strip — infinite marquee (static wrap under reduced motion) ── */}
      <section className="bg-card border-y border-border py-10 overflow-hidden">
        {reduced ? (
          <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {TRUST_ITEMS.map(({ Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 text-sm text-text-secondary"
              >
                <Icon size={16} className="text-brand shrink-0" />
                {label}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex w-max [animation:marquee_26s_linear_infinite]">
            {/* Two identical halves → translateX(-50%) loops seamlessly */}
            {[0, 1].map((half) => (
              <div
                key={half}
                className="flex shrink-0 items-center gap-x-12 pr-12"
                aria-hidden={half === 1}
              >
                {/* set ×3 per half so the track is wider than any viewport */}
                {[...TRUST_ITEMS, ...TRUST_ITEMS, ...TRUST_ITEMS].map(({ Icon, label }, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 text-sm text-text-secondary whitespace-nowrap"
                  >
                    <Icon size={16} className="text-brand shrink-0" />
                    {label}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 7 · Testimonials — snap carousel (dots appear when more quotes land) ── */}
      <section className="py-20 md:py-24 px-4 bg-inset">
        <div className="max-w-2xl mx-auto">
          <TestimonialCarousel reduced={reduced} />
        </div>
      </section>

      {/* ── 8 · Final CTA — few words + waitlist ── */}
      <section className="py-20 md:py-28 px-4 bg-page">
        <div className="max-w-xl mx-auto text-center flex flex-col items-center">
          <StaggerTitle
            text="Este domingo, no planees."
            reduced={reduced}
            className="font-display text-3xl sm:text-4xl font-semibold text-text-primary mb-8"
          />
          <motion.div {...(reduced ? {} : fadeUp(0.1))} className="w-full flex justify-center">
            <WaitlistForm />
          </motion.div>
          <motion.div {...(reduced ? {} : fadeUp(0.18))} className="mt-5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-brand transition-colors cursor-pointer py-2"
            >
              Ya tengo cuenta <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 px-4 bg-page">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="font-display font-medium text-text-primary">MaestraIA</span>
            <span className="text-xs text-text-muted">
              Hecho para maestras de México · © 2026 MaestraIA
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
            <Link href="/privacidad" className="hover:text-brand transition-colors cursor-pointer">
              Aviso de privacidad
            </Link>
            <Link href="/terminos" className="hover:text-brand transition-colors cursor-pointer">
              Términos de servicio
            </Link>
            <Link href="/login" className="hover:text-brand transition-colors cursor-pointer">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Fixed floating mascot (bottom-right corner) ── */}
      {/* PLACEHOLDER: replace CharacterAvatar's SVG with the real illustration when ready */}
      <motion.div
        className="fixed bottom-6 right-6 z-40 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.5 }}
      >
        <CharacterAvatar />
      </motion.div>
    </div>
  )

  // Lenis smooth scroll wraps the landing only (the app keeps native scrolling).
  if (reduced) return page
  return (
    <ReactLenis root options={{ duration: 1.1 }}>
      {page}
    </ReactLenis>
  )
}
