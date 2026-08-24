// Public explainer for families: how /familia access works. No data here — access is only
// ever granted through the teacher's personal invite link (parent_links token).
import Link from 'next/link'

export const metadata = { title: 'Acceso para familias' }

export default function FamiliaAccesoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold font-display text-text-primary mb-2 text-center">
          Portal de familias
        </h1>
        <p className="text-sm text-text-secondary text-center mb-8">
          Aquí ves las tareas, juegos, avisos y el vocabulario de tu hijo/a.
        </p>

        <ol className="space-y-4 mb-8">
          <li className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium text-text-primary">1. La maestra te invita</p>
            <p className="mt-1 text-xs text-text-secondary">
              Por seguridad de los niños, el acceso es únicamente con la invitación personal que la
              maestra envía a tu correo. Sin esa invitación no es posible entrar.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium text-text-primary">2. Abre el enlace del correo</p>
            <p className="mt-1 text-xs text-text-secondary">
              Crea tu cuenta (o entra con Google) desde ese enlace. Queda ligada solo a tu hijo/a —
              nadie más puede ver su información.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium text-text-primary">3. Después, entra normal</p>
            <p className="mt-1 text-xs text-text-secondary">
              Las siguientes veces solo inicia sesión y llegarás directo al portal de tu familia.
            </p>
          </li>
        </ol>

        <div className="rounded-xl border border-border bg-card p-4 mb-8 text-center">
          <p className="text-xs text-text-secondary">
            ¿No encuentras tu invitación o ya venció? Pídele a la maestra de tu hijo/a que te la
            reenvíe — tarda un minuto.
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Ya tengo cuenta — iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
