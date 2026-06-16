'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'

const STEPS = [
  {
    number: 1,
    title: 'Abre el panel de Richmond → haz clic en tu grupo',
    description:
      'Inicia sesión en richmondlp.com. En el panel principal verás tus grupos. Haz clic en el nombre del grupo que quieres sincronizar.',
    imageSrc: '/images/extension-guide/richmond_1.jpg',
  },
  {
    number: 2,
    title: 'Dentro del grupo → pestaña Markbook',
    description:
      'Una vez dentro del grupo verás varias pestañas en la parte superior. Selecciona "Markbook" para abrir el libro de calificaciones.',
    imageSrc: '/images/extension-guide/richmond_2.jpg',
  },
  {
    number: 3,
    title: 'En Markbook → navega a la sección Scores',
    description:
      'Dentro del Markbook encontrarás la sección "Scores". Ábrela para ver las calificaciones individuales de cada tarea. La extensión captura los datos en este momento.',
    imageSrc: '/images/extension-guide/richmond_3.jpg',
  },
  {
    number: 4,
    title: 'Listo — regresa al panel principal de Richmond y selecciona otro grupo',
    description:
      'La extensión detecta la carga de Scores y sincroniza automáticamente. Para sincronizar otro grupo, regresa al panel principal de richmondlp.com y repite el proceso.',
    imageSrc: '/images/extension-guide/richmond_4.jpg',
  },
] as const

export function RichmondExtensionGuide() {
  return (
    <div className="space-y-4 mt-4">
      <p className="text-xs text-text-secondary">
        Repite estos pasos para cada grupo que quieras sincronizar.
      </p>
      {STEPS.map((step, i) => (
        <motion.div
          key={step.number}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-surface border border-border"
        >
          {/* Left: number + text */}
          <div className="flex gap-3 sm:w-1/2">
            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
              {step.number}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{step.title}</p>
              <p className="text-xs text-text-secondary mt-1">{step.description}</p>
            </div>
          </div>

          {/* Right: screenshot or placeholder */}
          <div className="sm:w-1/2">
            <ImageWithFallback src={step.imageSrc} number={step.number} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function ImageWithFallback({ src, number }: { src: string; number: number }) {
  // next/image requires known dimensions; use unoptimized for local screenshots
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
      <Image
        src={src}
        alt={`Paso ${number}`}
        fill
        className="object-cover"
        unoptimized
        onLoad={(e) => {
          const ph = (e.currentTarget as HTMLImageElement).parentElement?.querySelector(
            '.placeholder'
          )
          if (ph) (ph as HTMLElement).style.display = 'none'
        }}
        onError={(e) => {
          // Hide broken image, show placeholder via parent
          const target = e.currentTarget as HTMLImageElement
          target.style.display = 'none'
          const placeholder = target.parentElement?.querySelector('.placeholder')
          if (placeholder) (placeholder as HTMLElement).style.display = 'flex'
        }}
      />
      {/* Shown until image loads or on error */}
      <div
        className="placeholder absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted"
        style={{ display: 'flex' }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="6" width="36" height="26" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2" y="6" width="36" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="20" cy="36" r="2" fill="currentColor" />
          <line x1="14" y1="36" x2="26" y2="36" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="text-xs">Paso {number}</span>
      </div>
    </div>
  )
}
