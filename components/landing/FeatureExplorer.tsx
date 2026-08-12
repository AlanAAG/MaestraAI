'use client'
// Interactive feature explorer for the landing — the "show, don't tell" section.
// Pattern borrowed from the best converting EdTech landings: tabbed real-interface mockups
// (feature switching without scrolling) + an integrated-loop narrative + a colorful long-tail
// grid. Stays inside the warm-cream design system; each tab gets its own accent.
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  Gamepad2,
  Heart,
  Megaphone,
  School,
  Sparkles,
  MessagesSquare,
  Upload,
  Star,
  Wand2,
  FileDown,
  RefreshCw,
  Trophy,
  Palette,
  Check,
} from 'lucide-react'

// ── Per-tab mock visuals (tiny, honest interface states — no screenshots needed) ──

function MockPlan() {
  return (
    <div className="w-full rounded-xl border-2 border-amber-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-amber-700">Metodología: Gamificación</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
          NEM · SEP 2024
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-gray-900">Misión: Guardianes del Planeta 🌎</p>
      <div className="mt-2 space-y-1.5">
        {['Narrativa e inmersión', 'Misiones y retos', 'Logros e insignias', 'Evento final'].map(
          (m) => (
            <div key={m} className="flex items-center gap-2 text-xs text-gray-700">
              <Check size={12} className="shrink-0 text-emerald-500" />
              <span className="font-medium">{m}</span>
              <span className="ml-auto h-1.5 w-16 rounded-full bg-amber-100" />
            </div>
          )
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
          Word
        </span>
        <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
          PDF
        </span>
        <span className="ml-auto rounded-md bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white">
          Lista en 3 min
        </span>
      </div>
    </div>
  )
}

function MockGames() {
  const tiles = [
    { e: '🦁', bg: 'bg-rose-50 border-rose-200' },
    { e: '🐘', bg: 'bg-sky-50 border-sky-200' },
    { e: '🦒', bg: 'bg-emerald-50 border-emerald-200' },
    { e: '🐸', bg: 'bg-violet-50 border-violet-200' },
  ]
  return (
    <div className="w-full rounded-xl border-2 border-rose-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-rose-700">¿Cuál es la palabra?</span>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
          Letra Ll
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {tiles.map((t, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-lg border text-2xl ${t.bg}`}
          >
            {t.e}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-1.5">
        <span className="text-[11px] font-medium text-emerald-800">Leo · 9 de 10 aciertos</span>
        <Trophy size={13} className="text-emerald-600" />
      </div>
    </div>
  )
}

function MockFamilia() {
  return (
    <div className="w-full rounded-xl border-2 border-sky-200 bg-white p-4 shadow-sm">
      <span className="text-[11px] font-semibold text-sky-700">Portal de familias</span>
      <div className="mt-2 space-y-2">
        <div className="rounded-lg border border-gray-200 px-3 py-2">
          <p className="text-xs font-semibold text-gray-900">📝 Tarea: memorama de la letra M</p>
          <p className="text-[10px] text-gray-500">entrega: viernes</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
          <span className="text-[11px] font-medium text-emerald-800">Regina — Entregado</span>
          <Check size={13} className="text-emerald-600" />
        </div>
        <div className="rounded-lg border border-dashed border-sky-300 px-3 py-2 text-center text-[11px] font-medium text-sky-700">
          <Upload size={12} className="mr-1 inline" /> Subir tarea (foto o PDF)
        </div>
      </div>
    </div>
  )
}

function MockGrupos() {
  return (
    <div className="w-full rounded-xl border-2 border-violet-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-violet-700">Kinder 3A · Muro</span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
          📣 Anuncio
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-gray-900">Festival de primavera 🌸</p>
      <p className="text-[11px] text-gray-600">Viernes 10:00 · traer flores de papel</p>
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-[11px] font-medium text-violet-800">
        <Check size={12} /> Correo enviado a 18 familias
      </div>
      <div className="mt-2 rounded-lg border border-gray-200 px-3 py-2">
        <p className="text-[11px] text-gray-700">
          <span className="font-semibold">Familia de Dylan:</span> ¿pueden ser de cartulina?
        </p>
        <p className="mt-0.5 text-[11px] text-violet-700">
          <span className="font-semibold">Miss Ale:</span> ¡Claro que sí! 💐
        </p>
      </div>
    </div>
  )
}

function MockEscuela() {
  return (
    <div className="w-full rounded-xl border-2 border-emerald-200 bg-white p-4 shadow-sm">
      <span className="text-[11px] font-semibold text-emerald-700">maestraia.com/escuela/epa</span>
      <p className="mt-1 text-sm font-bold text-gray-900">Escuela EPA</p>
      <div className="mt-2 space-y-1.5">
        {[
          ['Dirección', 'administra e invita'],
          ['Maestras', 'planean y comparten'],
          ['Familias', 'ven solo lo suyo'],
        ].map(([rol, desc]) => (
          <div key={rol} className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-gray-800">{rol}</span>
            <span className="text-gray-500">{desc}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800">
        Solo correos invitados pueden entrar
      </div>
    </div>
  )
}

// ── Tabs ──

const TABS = [
  {
    id: 'planear',
    label: 'Planeaciones',
    Icon: CalendarDays,
    accent: 'amber',
    title: 'Tu planeación NEM, en tu voz y tu formato',
    bullets: [
      'Contenidos y PDA oficiales (1°, 2° y 3°) — verbatim, nunca inventados',
      'Proyecto, taller, centro de interés o todo como juego con Gamificación',
      'Aprende de tus correcciones: cada planeación sale más tuya',
    ],
    Visual: MockPlan,
  },
  {
    id: 'jugar',
    label: 'Juegos y materiales',
    Icon: Gamepad2,
    accent: 'rose',
    title: 'Juegos con TU vocabulario, dentro y fuera del aula',
    bullets: [
      '9 juegos + hojas de trabajo con tus palabras y tus dibujos',
      'Los niños juegan en casa con un link — sin cuentas ni contraseñas',
      'Tú ves los aciertos de cada niño y pones la meta de la tarea',
    ],
    Visual: MockGames,
  },
  {
    id: 'familias',
    label: 'Familias',
    Icon: Heart,
    accent: 'sky',
    title: 'Las familias ven lo que importa — y nada más',
    bullets: [
      'Tareas con material para resolver y estado Entregado/Pendiente',
      'Suben la tarea en foto o PDF desde su celular',
      'Foro de dudas directo contigo, con aviso al correo',
    ],
    Visual: MockFamilia,
  },
  {
    id: 'grupos',
    label: 'Grupos y anuncios',
    Icon: Megaphone,
    accent: 'violet',
    title: 'Tu grupo como un salón digital',
    bullets: [
      'Anuncios y tareas que llegan por correo a todas las familias',
      'Archivos adjuntos: circulares, fotos, páginas del libro',
      'Entregas por alumno, en un solo lugar',
    ],
    Visual: MockGrupos,
  },
  {
    id: 'escuela',
    label: 'Escuelas',
    Icon: School,
    accent: 'emerald',
    title: 'Un espacio por escuela, con roles y permisos',
    bullets: [
      'La dirección invita a las maestras por correo — nadie más entra',
      'Portal propio: maestraia.com/escuela/tu-escuela',
      'Formatos y anuncios compartidos entre el equipo',
    ],
    Visual: MockEscuela,
  },
] as const

const ACCENTS: Record<string, { active: string; ring: string; dot: string }> = {
  amber: {
    active: 'bg-amber-500 text-white border-amber-500',
    ring: 'focus-visible:ring-amber-500',
    dot: 'text-amber-500',
  },
  rose: {
    active: 'bg-rose-500 text-white border-rose-500',
    ring: 'focus-visible:ring-rose-500',
    dot: 'text-rose-500',
  },
  sky: {
    active: 'bg-sky-500 text-white border-sky-500',
    ring: 'focus-visible:ring-sky-500',
    dot: 'text-sky-500',
  },
  violet: {
    active: 'bg-violet-500 text-white border-violet-500',
    ring: 'focus-visible:ring-violet-500',
    dot: 'text-violet-500',
  },
  emerald: {
    active: 'bg-emerald-500 text-white border-emerald-500',
    ring: 'focus-visible:ring-emerald-500',
    dot: 'text-emerald-500',
  },
}

export function FeatureExplorer({
  reduced,
  onCta,
}: {
  reduced: boolean | null
  onCta: () => void
}) {
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('planear')
  const tab = TABS.find((t) => t.id === active)!
  const accent = ACCENTS[tab.accent]

  return (
    <section id="como-funciona" className="bg-page px-4 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-3xl font-semibold text-text-primary md:text-4xl">
          Conócela por dentro
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-text-secondary">
          Sin videos de 10 minutos: así se ve MaestraIA trabajando para ti.
        </p>

        {/* Tab bar — 48px targets, keyboard-friendly */}
        <div
          role="tablist"
          aria-label="Funciones de MaestraIA"
          className="mt-8 flex flex-wrap justify-center gap-2"
        >
          {TABS.map((t) => {
            const a = ACCENTS[t.accent]
            const isActive = t.id === active
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                className={`flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${a.ring} ${
                  isActive
                    ? a.active
                    : 'border-border bg-card text-text-secondary hover:border-border-strong'
                }`}
              >
                <t.Icon size={16} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Panel: visual + bullets */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab.id}
            role="tabpanel"
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-10 grid items-center gap-10 md:grid-cols-2"
          >
            <div className="order-2 mx-auto w-full max-w-sm md:order-1">
              <tab.Visual />
            </div>
            <div className="order-1 md:order-2">
              <h3 className="font-display text-2xl font-semibold text-text-primary">{tab.title}</h3>
              <ul className="mt-5 space-y-3">
                {tab.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-text-secondary">
                    <Sparkles size={16} className={`mt-1 shrink-0 ${accent.dot}`} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onCta}
                className="mt-7 cursor-pointer rounded-full bg-brand px-6 py-3 font-display text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                Quiero probarla
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* The loop — integrated narrative in one line */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-2 md:gap-4">
          {['Planea', 'Comparte', 'Juegan', 'Aprende de ti'].map((s, i) => (
            <span key={s} className="flex items-center gap-2 md:gap-4">
              <span className="rounded-full border-2 border-border bg-card px-4 py-2 font-display text-sm font-semibold text-text-primary">
                {s}
              </span>
              {i < 3 && <span className="text-text-muted">→</span>}
            </span>
          ))}
          <span className="ml-1 text-sm text-text-secondary">y cada quincena sale mejor.</span>
        </div>

        {/* Long-tail grid — the features that don't need a whole section */}
        <div className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              Icon: Wand2,
              t: 'Voz de la maestra',
              d: 'Escribe como tú, no como robot',
              c: 'text-amber-600 bg-amber-50 border-amber-200',
            },
            {
              Icon: Star,
              t: 'Feedback que aprende',
              d: 'Califica y comenta: la IA mejora',
              c: 'text-rose-600 bg-rose-50 border-rose-200',
            },
            {
              Icon: Palette,
              t: 'Colorear en línea',
              d: 'Pincel y crayones digitales',
              c: 'text-violet-600 bg-violet-50 border-violet-200',
            },
            {
              Icon: FileDown,
              t: 'Word y PDF',
              d: 'Con tu formato escolar exacto',
              c: 'text-sky-600 bg-sky-50 border-sky-200',
            },
            {
              Icon: RefreshCw,
              t: 'Sync con Richmond',
              d: 'Calificaciones automáticas',
              c: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            },
            {
              Icon: MessagesSquare,
              t: 'Foro por grupo',
              d: 'Dudas con aviso al correo',
              c: 'text-amber-600 bg-amber-50 border-amber-200',
            },
            {
              Icon: Trophy,
              t: 'Aciertos en casa',
              d: 'Meta de tarea y repetir si falta',
              c: 'text-rose-600 bg-rose-50 border-rose-200',
            },
            {
              Icon: Upload,
              t: 'Archivos de apoyo',
              d: 'La IA lee tus circulares y libros',
              c: 'text-sky-600 bg-sky-50 border-sky-200',
            },
          ].map(({ Icon, t, d, c }) => (
            <div
              key={t}
              className={`rounded-xl border-2 p-4 transition-transform duration-200 hover:-translate-y-0.5 ${c.split(' ').slice(1).join(' ')}`}
            >
              <Icon size={20} className={c.split(' ')[0]} />
              <p className="mt-2 text-sm font-semibold text-gray-900">{t}</p>
              <p className="mt-0.5 text-xs text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
