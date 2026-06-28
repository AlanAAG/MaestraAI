'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Upload, FileText, Download, Loader2, Lock } from 'lucide-react'

// ponytail: 🦉 emoji stands in for the owl mascot until the real illustration lands (poses noted
// per-section in comments). Demo + testimonials use placeholders rather than fabricated assets.

const SEED_COUNT = 20 // real Wave-0 number; bump as the list grows
const GRADES = ['Kinder 1', 'Kinder 2', 'Kinder 3', 'Directora', 'Otro']

function scrollToForm() {
  document.getElementById('waitlist-form')?.scrollIntoView({ behavior: 'smooth' })
}

export default function WaitlistLanding() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const reveal = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.5 },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-white to-white text-text-primary">
      {/* Minimal top bar — logo only (no nav menu during waitlist). */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-bold"
        >
          Maestra<span className="text-primary">IA</span>
        </button>
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Iniciar sesión
        </Link>
      </header>

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-5xl items-center gap-8 px-5 pb-10 pt-6 md:grid-cols-[1.2fr_0.8fr] md:pt-12">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Tu planeación quincenal, <span className="text-primary">lista en minutos.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-text-secondary">
            Genera planeaciones completas alineadas al NEM 2024 — con el formato exacto que tú ya
            usas. Sin empezar desde cero.
          </p>
          <div className="mt-7 flex flex-col items-start gap-3">
            <button
              onClick={scrollToForm}
              className="rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
            >
              Reserva tu lugar gratis →
            </button>
            <p className="text-sm text-text-secondary">
              🦉 Las primeras <strong className="text-text-primary">{SEED_COUNT} maestras</strong>{' '}
              ya están dentro
            </p>
          </div>
        </div>
        {/* Mascot: welcome/neutral pose. Stacks below headline on mobile. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-primary/10 text-[5rem] md:h-56 md:w-56 md:text-[7rem]"
          aria-hidden
        >
          🦉
        </motion.div>
      </section>

      {/* ── Section 2: How it works ─────────────────────────────────────── */}
      <motion.section {...reveal} className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Así de fácil es tu día</h2>
        <p className="mt-2 text-center text-text-secondary">
          Tu flujo de siempre, sin las 4 horas. {/* mascot: pointing pose anchors this section */}
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Upload,
              step: '1',
              title: 'Subes tu ejemplo de planeación anterior',
              result: 'La IA aprende tu formato y estilo exacto',
            },
            {
              icon: FileText,
              step: '2',
              title: 'Describes tu proyecto: tema, semana, grupo, alumnos con NEE',
              result: 'Completas el formulario guiado en 2 minutos',
            },
            {
              icon: Download,
              step: '3',
              title: 'Descargas tu planeación completa',
              result: 'Lista para imprimir o compartir con tu directora',
            },
          ].map((s) => (
            <div key={s.step} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon size={22} />
              </div>
              <p className="text-xs font-bold text-primary">Paso {s.step}</p>
              <p className="mt-1 font-semibold leading-snug">{s.title}</p>
              <p className="mt-2 text-sm text-text-secondary">→ {s.result}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Section 3: Demo / proof ─────────────────────────────────────── */}
      <motion.section {...reveal} className="mx-auto max-w-4xl px-5 py-14">
        <p className="mb-5 text-center text-text-secondary">
          Esto es lo que genera MaestraIA — para una planeación real de Kinder 3, proyecto sobre el
          agua, 2ª quincena de septiembre.
        </p>
        {/* Placeholder until a real screenshot/GIF of actual output is dropped in. */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-16 text-center">
          <div className="text-5xl" aria-hidden>
            🦉
          </div>
          <div className="h-2 w-48 overflow-hidden rounded-full bg-primary/15">
            <motion.div
              className="h-full bg-primary"
              animate={{ x: ['-100%', '250%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '40%' }}
            />
          </div>
          <p className="text-sm font-medium text-text-secondary">
            Generando tu planeación… suele tomar entre 45 y 90 segundos.
          </p>
        </div>
      </motion.section>

      {/* ── Section 4: Testimonial ──────────────────────────────────────── */}
      <motion.section {...reveal} className="mx-auto max-w-2xl px-5 py-14">
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <p className="text-lg leading-relaxed">
            “Antes me tardaba 4 horas en una planeación quincenal. Con MaestraIA la tengo en 15
            minutos y me queda mejor que la que yo hacía.”
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
              D
            </span>
            <p className="text-sm text-text-secondary">
              <strong className="text-text-primary">Daniela R.</strong> — maestra de Kinder 2,
              colegio privado, CDMX
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Section 5: Waitlist form ────────────────────────────────────── */}
      <section id="waitlist-form" className="mx-auto max-w-md px-5 py-14">
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-7 text-center"
          >
            <div className="text-4xl">🦉</div>
            <h3 className="mt-2 text-xl font-bold">¡Ya estás en la lista!</h3>
            <p className="mt-1 text-text-secondary">
              Estás en el lugar <strong className="text-primary">#{done.position}</strong>.
            </p>
            <p className="mt-4 text-sm text-text-secondary">
              Comparte con tus colegas y sube de posición:
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/?ref=${done.ref_code}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="mt-2 w-full truncate rounded-lg border border-primary/40 bg-white px-3 py-2 text-sm text-primary hover:bg-primary/5"
            >
              {copied ? '¡Enlace copiado! ✓' : `${window.location.origin}/?ref=${done.ref_code}`}
            </button>
            <div className="mt-4 space-y-1 text-left text-sm text-text-secondary">
              <p>→ Invita 3 colegas = acceso prioritario</p>
              <p>→ Invita 5 colegas = primera ola + plantilla premium gratis</p>
            </div>
          </motion.div>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-white p-7 shadow-sm"
          >
            <h3 className="text-center text-xl font-bold">Reserva tu lugar</h3>
            <div className="mt-5 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="tu@correo.com"
                required
                className="w-full rounded-lg border border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">¿Qué grado enseñas?</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              Reservar mi lugar gratis
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-text-secondary">
              <Lock size={12} /> Sin tarjeta. Te avisamos cuando sea tu turno. Tu correo nunca se
              comparte.
            </p>
          </form>
        )}
      </section>

      {/* ── Section 6: FAQ ──────────────────────────────────────────────── */}
      <motion.section {...reveal} className="mx-auto max-w-2xl px-5 py-14">
        <h2 className="text-center text-2xl font-bold">Preguntas frecuentes</h2>
        <div className="mt-8 space-y-3">
          {[
            {
              q: '¿El contenido realmente sigue el NEM 2024 y el Programa Fase 2?',
              a: 'Sí. MaestraIA está entrenada con el Programa de Estudio para la Educación Preescolar, Fase 2, SEP 2024. Los PDAs que genera son los oficiales, citados textualmente — no los inventa.',
            },
            {
              q: '¿Puedo usar mi propio formato de planeación?',
              a: 'Sí. Subes una planeación anterior como ejemplo y la IA aprende tu estructura exacta — campos, orden y estilo de redacción.',
            },
            {
              q: '¿Necesito saber de IA o tecnología para usarla?',
              a: 'No. Si sabes usar WhatsApp y Google Docs, puedes usar MaestraIA. Es tan fácil como llenar un formulario.',
            },
            {
              q: '¿Qué pasa con mis datos y los de mis alumnos?',
              a: 'MaestraIA no almacena datos personales de alumnos. Solo usas nombres de pila en las secciones de ajustes razonables, y esa información nunca sale de tu sesión.',
            },
          ].map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-border bg-white p-4 [&_summary]:cursor-pointer"
            >
              <summary className="flex list-none items-center justify-between font-medium">
                {f.q}
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-text-secondary">{f.a}</p>
            </details>
          ))}
        </div>
      </motion.section>

      {/* ── Section 7: Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-10 text-center text-sm text-text-secondary">
          <p className="font-bold text-text-primary">
            Maestra<span className="text-primary">IA</span>
          </p>
          <p className="mt-1">Planeaciones inteligentes para maestras reales.</p>
          <p className="mt-3">
            <a href="mailto:hola@maestraia.com" className="hover:text-text-primary">
              hola@maestraia.com
            </a>
          </p>
          <p className="mt-3">Hecho en México 🇲🇽</p>
        </div>
      </footer>
    </div>
  )
}
