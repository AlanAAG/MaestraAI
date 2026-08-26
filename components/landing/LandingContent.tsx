'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
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
  Play,
  Puzzle,
  Ear,
  FileText,
  Download,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { FeatureExplorer } from './FeatureExplorer'

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

// ── La Maestra — illustrated teacher character ────────────────────────────────

function MascotIllustration({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 160 192" fill="none" aria-hidden>
      {/* body — violet blouse */}
      <rect x="28" y="128" width="104" height="64" rx="24" fill="#7C3AED" />
      {/* collar details */}
      <path d="M64 128 L80 144 L96 128" fill="#6D28D9" />
      {/* star on blouse */}
      <path d="M80 158 l3 9h9l-7 5 3 9-8-5-8 5 3-9-7-5h9z" fill="#FCD34D" />
      {/* arms */}
      <ellipse cx="22" cy="155" rx="14" ry="28" fill="#7C3AED" transform="rotate(-8 22 155)" />
      <ellipse cx="138" cy="155" rx="14" ry="28" fill="#7C3AED" transform="rotate(8 138 155)" />
      {/* right hand holding book */}
      <rect x="122" y="168" width="28" height="36" rx="4" fill="#F59E0B" />
      <rect x="122" y="168" width="4" height="36" rx="2" fill="#D97706" />
      <line
        x1="130"
        y1="174"
        x2="148"
        y2="174"
        stroke="#FBBF24"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="130"
        y1="180"
        x2="148"
        y2="180"
        stroke="#FBBF24"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* neck */}
      <rect x="69" y="118" width="22" height="20" rx="6" fill="#E8C4A0" />
      {/* hair back layer */}
      <ellipse cx="80" cy="88" rx="44" ry="40" fill="#2D1B00" />
      {/* head */}
      <ellipse cx="80" cy="93" rx="38" ry="38" fill="#E8C4A0" />
      {/* hair top (covers crown) */}
      <ellipse cx="80" cy="60" rx="40" ry="22" fill="#2D1B00" />
      {/* bun */}
      <circle cx="80" cy="44" r="18" fill="#2D1B00" />
      {/* bun highlight */}
      <circle cx="74" cy="39" r="5" fill="#3D2B10" />
      {/* hair side tendrils */}
      <path
        d="M41 90 Q34 100 38 115"
        stroke="#2D1B00"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M119 90 Q126 100 122 115"
        stroke="#2D1B00"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {/* eyebrows */}
      <path
        d="M56 82 Q63 78 70 82"
        stroke="#2D1B00"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 82 Q97 78 104 82"
        stroke="#2D1B00"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* glasses — rose frames */}
      <circle cx="63" cy="95" r="13" fill="white" stroke="#E11D48" strokeWidth="3" />
      <circle cx="97" cy="95" r="13" fill="white" stroke="#E11D48" strokeWidth="3" />
      <path d="M76 95 L84 95" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
      {/* eyes */}
      <circle cx="63" cy="95" r="6" fill="#2D1B00" />
      <circle cx="97" cy="95" r="6" fill="#2D1B00" />
      <circle cx="65" cy="93" r="2" fill="white" />
      <circle cx="99" cy="93" r="2" fill="white" />
      {/* cheeks */}
      <ellipse cx="47" cy="107" rx="8" ry="5" fill="#F9A8C9" opacity="0.6" />
      <ellipse cx="113" cy="107" rx="8" ry="5" fill="#F9A8C9" opacity="0.6" />
      {/* smile */}
      <path
        d="M66 114 Q80 124 94 114"
        stroke="#B45309"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* small apple in left hand */}
      <circle cx="24" cy="176" r="10" fill="#EF4444" />
      <path
        d="M24 166 Q26 160 30 162"
        stroke="#16A34A"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="20" cy="171" rx="3" ry="4" fill="#F87171" opacity="0.6" />
    </svg>
  )
}

function CharacterAvatar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-12 h-12 rounded-full border border-border bg-brand-subtle flex items-center justify-center shrink-0 shadow-md overflow-hidden ${className}`}
    >
      <MascotIllustration size={42} />
    </div>
  )
}

// ── Inline UI mock-ups (light, warm palette) ──────────────────────────────────

function PlannerVisual() {
  const rows = [
    { day: 'Lun', label: 'Proyecto mensual', filled: true },
    { day: 'Mar', label: 'Letter & Number', filled: true },
    { day: 'Mié', label: 'Ed. Física', filled: true },
    { day: 'Jue', label: '', filled: false },
  ]
  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur border border-violet-100 shadow-xl p-4 w-56">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-text-primary">Quincena lista</span>
        <span className="text-[10px] bg-brand-subtle text-brand px-2 py-0.5 rounded-full font-semibold">
          10 min ✓
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ day, label, filled }) => (
          <div key={day} className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted w-7 shrink-0 font-medium">{day}</span>
            <div
              className={`flex-1 h-6 rounded-lg flex items-center px-2.5 ${filled ? 'bg-brand-subtle' : 'bg-inset'}`}
            >
              {filled && (
                <span className="text-[9px] text-brand font-medium truncate">{label}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[9px] text-text-muted">
        <FileText size={11} className="text-brand" />
        NEM 2024 · Campos formativos incluidos
      </div>
    </div>
  )
}

function MaterialsVisual() {
  const types = [
    { name: 'Flashcards', Icon: CreditCard },
    { name: 'Memorama', Icon: Grid3X3 },
    { name: 'Bingo', Icon: Target },
    { name: 'Juegos', Icon: Puzzle },
  ]
  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur border border-violet-100 shadow-xl p-4 w-56">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-text-primary">Materiales al instante</span>
        <span className="text-[10px] bg-success-light text-success-text px-2 py-0.5 rounded-full font-semibold">
          9 tipos
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {types.map(({ name, Icon }) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center">
              <Icon size={18} className="text-brand" />
            </div>
            <span className="text-[8px] text-text-muted font-medium text-center leading-tight">
              {name}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-inset px-2.5 py-1.5">
        <Link2 size={11} className="text-brand shrink-0" />
        <span className="text-[9px] text-text-muted">
          Comparte en segundos · para jugar en casa
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
  { Icon: Star, label: 'Alineado al programa SEP 2024' },
  { Icon: CheckCircle2, label: 'Sin calificaciones numéricas' },
  { Icon: Lock, label: 'Datos protegidos' },
  { Icon: ShieldCheck, label: 'Hecho para México' },
]

// ── Pricing section ──────────────────────────────────────────────────────────

const PLAN_FEATURES = [
  { label: 'Planeaciones listas en minutos', individual: true, school: true },
  { label: '9 tipos de juegos y materiales', individual: true, school: true },
  { label: 'Diario de la educadora con IA', individual: true, school: true },
  { label: 'Portal para papás y familias', individual: true, school: true },
  { label: 'Sincronización con Richmond', individual: true, school: true },
  { label: 'Vista de seguimiento para dirección', individual: false, school: true },
  { label: 'Toda la planta docente incluida', individual: false, school: true },
  { label: 'La dirección revisa planeaciones', individual: false, school: true },
  { label: 'Portal propio de la escuela', individual: false, school: true },
  { label: 'Soporte prioritario', individual: false, school: true },
]

function CheckIcon({ yes }: { yes: boolean }) {
  return yes ? (
    <CheckCircle2 size={18} className="text-violet-600 shrink-0" />
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-text-muted opacity-40"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function PricingSection({ reduced }: { reduced: boolean | null }) {
  const [schoolName, setSchoolName] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [schoolSize, setSchoolSize] = useState('')
  const [sent, setSent] = useState(false)

  function handleSchoolContact(e: React.FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`Solicitud de cuenta escolar — ${schoolName}`)
    const body = encodeURIComponent(
      `Escuela: ${schoolName}\nContacto: ${schoolEmail}\nMaestras aprox.: ${schoolSize}`
    )
    window.open(`mailto:hola@maestraia.com?subject=${subject}&body=${body}`)
    setSent(true)
  }

  return (
    <section
      id="precios"
      className="py-20 md:py-28 px-4"
      style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f3f0ff 100%)' }}
    >
      <div className="max-w-5xl mx-auto">
        <motion.div {...(reduced ? {} : fadeUp())} className="text-center mb-12">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-full mb-4"
            style={{ background: '#EDE9FE', color: '#7C3AED' }}
          >
            <Star size={12} filled className="text-violet-600" />
            Planes
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary">
            Empieza hoy, gratis.
          </h2>
          <p className="mt-3 text-text-secondary max-w-lg mx-auto">
            Para la maestra que quiere trabajar menos el fin de semana — y para la escuela que
            quiere más de su equipo docente.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Individual card */}
          <motion.div
            {...(reduced ? {} : popIn(0.05))}
            className="bg-white rounded-2xl border border-border shadow-md p-8 flex flex-col"
          >
            <div className="mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                Para la maestra
              </span>
              <div className="mt-2 font-display text-4xl font-bold text-text-primary">
                Gratis
                <span className="text-xl font-normal text-text-muted"> durante el piloto</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                Sin tarjeta. Empieza a planear hoy mismo.
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PLAN_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm text-text-secondary">
                  <CheckIcon yes={f.individual} />
                  <span className={f.individual ? '' : 'opacity-40'}>{f.label}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="w-full flex items-center justify-center gap-2 py-4 rounded-lg font-display font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
            >
              Comenzar gratis <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* School card */}
          <motion.div
            {...(reduced ? {} : popIn(0.12))}
            className="rounded-2xl p-8 flex flex-col text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 60%, #7C3AED 100%)' }}
          >
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
              style={{
                background: 'radial-gradient(circle, white, transparent)',
                transform: 'translate(30%, -30%)',
              }}
            />

            <div className="mb-6">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-violet-200">
                <Star size={11} filled className="text-yellow-300" /> Para la escuela
              </span>
              <div className="mt-2 font-display text-4xl font-bold">
                A la medida
                <span className="text-xl font-normal text-violet-300"> de tu escuela</span>
              </div>
              <p className="mt-2 text-sm text-violet-200">
                Toda la planta docente, un solo lugar. Precio según el tamaño de tu equipo.
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PLAN_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm text-violet-100">
                  {f.school ? (
                    <CheckCircle2 size={18} className="text-yellow-300 shrink-0" />
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                      className="shrink-0 opacity-30"
                    >
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                  {f.label}
                </li>
              ))}
            </ul>

            {sent ? (
              <div className="rounded-lg bg-white/10 px-5 py-4 text-center text-sm text-violet-100">
                ¡Listo! Abre tu correo y envía el mensaje. Te respondemos en menos de 24 h.
              </div>
            ) : (
              <form onSubmit={handleSchoolContact} className="space-y-3">
                <input
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Nombre del colegio o institución"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder:text-violet-300 focus:outline-none focus:border-white/50"
                />
                <input
                  required
                  type="email"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder:text-violet-300 focus:outline-none focus:border-white/50"
                />
                <select
                  required
                  value={schoolSize}
                  onChange={(e) => setSchoolSize(e.target.value)}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm text-white focus:outline-none focus:border-white/50"
                >
                  <option value="" className="text-text-primary">
                    ¿Cuántas maestras hay en tu equipo?
                  </option>
                  {['2–5', '6–15', '16–40', '40+'].map((n) => (
                    <option key={n} value={n} className="text-text-primary">
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full py-4 rounded-lg bg-white text-violet-700 font-display font-semibold text-sm hover:bg-violet-50 transition-colors active:scale-[0.98] cursor-pointer"
                >
                  Quiero saber más →
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

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
            <a href="#precios" className="hover:text-text-primary transition-colors cursor-pointer">
              Precios
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2 cursor-pointer"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-display font-semibold text-white px-4 py-2 rounded-lg transition-all active:scale-[0.98] cursor-pointer min-h-[40px] flex items-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
            >
              Comenzar gratis
            </Link>
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
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-16 items-center">
            {/* Left — promise + waitlist */}
            <div>
              <motion.div {...(reduced ? {} : fadeUp(0))}>
                <span className="inline-flex items-center gap-1.5 bg-brand-subtle text-brand text-xs font-medium px-4 py-1.5 rounded-full mb-8">
                  <Star size={12} filled />
                  Para maestras de preescolar en México
                </span>
              </motion.div>

              <motion.h1
                {...(reduced ? {} : fadeUp(0.08))}
                className="font-display text-5xl lg:text-6xl font-bold text-text-primary leading-[1.02] tracking-tight"
              >
                Recupera{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #E11D48 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  tus domingos.
                </span>
              </motion.h1>

              <motion.p
                {...(reduced ? {} : fadeUp(0.16))}
                className="mt-5 text-xl text-text-secondary max-w-md leading-relaxed"
              >
                Planea tu quincena en minutos, crea juegos para tus alumnos y mantén a las familias
                al día. Sin horas extra el fin de semana.
              </motion.p>

              <motion.div
                {...(reduced ? {} : fadeUp(0.24))}
                className="mt-9 flex flex-col sm:flex-row gap-3 items-start"
                id="waitlist"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg text-white font-display font-semibold text-base transition-all active:scale-[0.97] cursor-pointer shadow-lg hover:shadow-xl hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
                >
                  Comenzar gratis <ArrowRight size={16} />
                </Link>
                <button
                  onClick={() =>
                    document
                      .getElementById('precios')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg border-2 border-violet-200 text-violet-700 font-display font-semibold text-base hover:bg-violet-50 transition-colors active:scale-[0.97] cursor-pointer"
                >
                  Para mi escuela
                </button>
              </motion.div>

              <motion.div
                {...(reduced ? {} : fadeUp(0.3))}
                className="mt-4 flex items-center gap-2"
              >
                <Lock size={12} className="text-text-muted" />
                <span className="text-xs text-text-muted">
                  Sin tarjeta · NEM 2024 · Datos protegidos
                </span>
              </motion.div>

              <motion.div {...(reduced ? {} : fadeUp(0.34))} className="mt-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer py-1"
                >
                  Ya tengo cuenta <ArrowRight size={14} />
                </Link>
              </motion.div>
            </div>

            {/* Right — full-bleed photo, cards sit below */}
            <motion.div
              style={reduced ? undefined : { y: heroY }}
              className="hidden md:block relative pb-28"
            >
              {/* Photo */}
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-2 ring-violet-100">
                <Image
                  src="/hero.jpeg"
                  alt="Maestra leyendo a sus alumnos de preescolar"
                  width={1400}
                  height={1050}
                  className="w-full h-[500px] object-cover object-center"
                  priority
                />
              </div>

              {/* PlannerVisual — top-left, slightly overlapping photo corner */}
              <Float
                reduced={reduced}
                distance={7}
                duration={4}
                className="absolute top-4 -left-36 z-10"
              >
                <PlannerVisual />
              </Float>

              {/* Lottie accent */}
              <LottieAccent
                src="/lottie/hero.json"
                className="absolute -top-6 right-4 w-20 pointer-events-none z-20"
              />

              {/* MaterialsVisual below the photo on the right */}
              <Float
                reduced={reduced}
                distance={9}
                duration={4.6}
                delay={0.5}
                className="absolute bottom-0 right-0 z-10"
              >
                <MaterialsVisual />
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
          <MetricCard
            value={4}
            label="Campos formativos"
            sublabel="según la SEP 2024"
            delay={0.16}
          />
          <MetricCard
            value={100}
            suffix="%"
            label="Sin calificaciones"
            sublabel="solo evaluación cualitativa"
            delay={0.24}
          />
        </div>
      </section>

      {/* ── 3 · "Todo tu trabajo, en un lugar" — 3 big visuals, one line each ── */}
      <section id="plataforma" className="bg-page py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <StaggerTitle
            text="Todo lo que necesitas para dar clases tranquila."
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
              {
                V: PlannerVisual,
                t: 'Planeaciones',
                d: 'Listas en minutos, con tu voz y tu formato.',
              },
              {
                V: MaterialsVisual,
                t: 'Juegos y materiales',
                d: 'Crea, proyecta y comparte con un enlace.',
              },
              {
                V: DiaryVisual,
                t: 'Diario de la educadora',
                d: 'Escribe tus notas, la IA lo redacta por ti.',
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
              text="Planeaciones que tu directora aprueba."
              reduced={reduced}
              className="font-display text-3xl md:text-4xl font-semibold text-text-primary leading-tight"
            />
            <p className="mt-4 text-text-secondary max-w-md">
              Contenidos de la SEP, tal como los pide el programa. Con tu formato y tu manera de
              enseñar — lista en minutos.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Chip Icon={CheckCircle2} label="Tal como pide la SEP" />
              <Chip Icon={FileText} label="Tu voz y tu formato" />
              <Chip Icon={ShieldCheck} label="Fichero de la Paz" />
              <Chip Icon={Download} label="Descarga en Word o PDF" />
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
              Con el vocabulario de tu quincena, para peques que aún aprenden a leer. Proyéctalos en
              clase o manda el enlace a los papás.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Chip Icon={Play} label="Proyecta en clase" />
              <Chip Icon={Link2} label="Juegan desde casa" />
              <Chip Icon={Ear} label="Imagen y audio incluidos" />
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

      {/* ── 5.5 · Feature explorer — tabbed real-interface mockups + loop + long-tail grid ── */}
      <FeatureExplorer reduced={reduced} onCta={scrollToWaitlist} />

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

      {/* ── 8 · Pricing ── */}
      <PricingSection reduced={reduced} />

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
