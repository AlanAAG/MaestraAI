import Link from 'next/link'
import { BookOpen, Clock, Download, Shield } from 'lucide-react'

export default function DiaryLandingPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-8 py-16">
      {/* Hero */}
      <section className="text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-primary text-sm font-medium">
          <Clock size={14} />5 minutos · Gratis · Sin registro
        </div>
        <h1 className="text-4xl font-bold text-text-primary leading-tight">
          Tu diario como maestra,
          <br />
          en 5 minutos.
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          Responde 5 preguntas sobre tu semana. La IA genera tu Diario de la Educadora —el formato
          que pide la NEM— listo para descargar e imprimir.
        </p>
        <Link
          href="/diary/nueva"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-[15px]
            bg-primary hover:bg-primary-dark transition-colors duration-150 min-h-[52px] shadow-sm"
        >
          Empezar esta semana →
        </Link>
        <p className="text-sm text-text-disabled">Sin tarjeta. Siempre gratis.</p>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
        {[
          {
            icon: BookOpen,
            title: 'Formato NEM',
            desc: 'Cumple con el Acuerdo 10/09/23 y los requerimientos de tu supervisora.',
          },
          {
            icon: Clock,
            title: '5 minutos',
            desc: 'No más 2 horas frente a la pantalla el viernes. Solo escribe como piensas.',
          },
          {
            icon: Download,
            title: 'PDF listo',
            desc: 'Descarga, imprime, firma. Sin formatear, sin copiar y pegar.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="p-5 rounded-2xl border border-[var(--color-border)] bg-surface space-y-3"
          >
            <Icon size={22} className="text-primary" strokeWidth={1.75} />
            <h3 className="font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* Privacy note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-light text-sm text-text-secondary">
        <Shield size={18} className="text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
        <span>
          Tus respuestas se procesan de forma segura y no se guardan en ningún servidor hasta que tú
          decidas crear una cuenta.
        </span>
      </div>
    </main>
  )
}
